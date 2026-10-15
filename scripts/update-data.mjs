#!/usr/bin/env node
/**
 * 50 Hz of Grey – data snapshot updater
 *
 * Fetches the datasets the dashboard needs from the Energy-Charts API v2
 * (Fraunhofer ISE), validates them and writes a compact snapshot to
 * public/data/latest.json. Runs in GitHub Actions before every build and
 * can be run locally with `npm run update-data`.
 *
 * Design goals:
 *  - respect the API's rate limits (2 req/min, burst 4; /price 2/min, burst 2)
 *  - honour HTTP 429 + Retry-After, retry transient errors with backoff
 *  - never invent data: failed datasets keep the previous snapshot's values
 *    (with their old timestamps) and are reported in the "errors" list
 *  - keep the file small (values rounded, regular time grids stored as
 *    start/step/count instead of one timestamp per record)
 *
 * No dependencies – Node 20+ (global fetch) is enough.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.ENERGY_CHARTS_BASE_URL ?? 'https://api.energy-charts.info';
const USER_AGENT = '50hz-of-grey snapshot updater (+https://github.com/fbw159/50hz-of-grey)';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'public', 'data', 'latest.json'));
const TIMEOUT_MS = 30_000;
const MINUTE = 60_000;

// ---------------------------------------------------------------------------
// Time helpers (Europe/Berlin day keys without a date library)
// ---------------------------------------------------------------------------
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
function berlinDayKey(ms) {
  return dayFmt.format(new Date(ms)); // en-CA → YYYY-MM-DD
}
function addDays(dayKey, n) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
function isoSeconds(ms) {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(/\.000Z$/, 'Z');
}

// ---------------------------------------------------------------------------
// Dataset definitions (keep in sync with src/services/energyChartsApi.ts)
// ---------------------------------------------------------------------------
function datasetSpecs(now) {
  const today = berlinDayKey(now);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  return [
    { key: 'frequency', endpoint: '/v2/frequency', params: { region: 'DE-Freiburg', start: isoSeconds(now - 60 * MINUTE), end: isoSeconds(now) }, decimals: 4, budget: 'default' },
    { key: 'price', endpoint: '/v2/price', params: { bzn: 'DE-LU', start: yesterday, end: tomorrow }, decimals: 2, budget: 'price' },
    { key: 'publicPower', endpoint: '/v2/public_power', params: { country: 'de', start: addDays(today, -2), end: today }, decimals: 1, budget: 'default' },
    { key: 'signal', endpoint: '/v2/signal', params: { country: 'de' }, decimals: 1, budget: 'signal' },
    { key: 'forecastSolar', endpoint: '/v2/public_power_forecast', params: { country: 'de', production_type: 'solar', forecast_type: 'day-ahead', start: today, end: tomorrow }, decimals: 1, budget: 'default', optional: true },
    { key: 'forecastWindOnshore', endpoint: '/v2/public_power_forecast', params: { country: 'de', production_type: 'wind_onshore', forecast_type: 'day-ahead', start: today, end: tomorrow }, decimals: 1, budget: 'default', optional: true },
    { key: 'forecastWindOffshore', endpoint: '/v2/public_power_forecast', params: { country: 'de', production_type: 'wind_offshore', forecast_type: 'day-ahead', start: today, end: tomorrow }, decimals: 1, budget: 'default', optional: true },
    { key: 'forecastLoad', endpoint: '/v2/public_power_forecast', params: { country: 'de', production_type: 'load', forecast_type: 'day-ahead', start: today, end: tomorrow }, decimals: 1, budget: 'default', optional: true },
    { key: 'installedPower', endpoint: '/v2/installed_power', params: { country: 'de', time_step: 'monthly' }, decimals: 3, budget: 'default' },
  ];
}

// ---------------------------------------------------------------------------
// Rate limiting: token buckets mirroring the documented server limits
// ---------------------------------------------------------------------------
class Bucket {
  constructor(capacity, perMinute) {
    this.capacity = capacity;
    this.perMinute = perMinute;
    this.tokens = capacity;
    this.last = Date.now();
    this.pausedUntil = 0;
  }
  refill() {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / MINUTE) * this.perMinute);
    this.last = now;
  }
  async take() {
    for (;;) {
      this.refill();
      const now = Date.now();
      const waitPause = Math.max(0, this.pausedUntil - now);
      if (this.tokens >= 1 && waitPause === 0) {
        this.tokens -= 1;
        return;
      }
      const waitTokens = this.tokens >= 1 ? 0 : ((1 - this.tokens) / this.perMinute) * MINUTE;
      const wait = Math.max(waitPause, waitTokens, 250);
      log(`  waiting ${(wait / 1000).toFixed(1)} s for request budget`);
      await sleep(wait);
    }
  }
  pause(ms) {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }
}
const BUCKETS = { default: new Bucket(4, 2), price: new Bucket(2, 2), signal: new Bucket(20, 20) };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log(...args);

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(message, status, retryAfterMs) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(value) {
  if (!value) return undefined;
  const s = Number(value);
  if (Number.isFinite(s)) return Math.max(0, s * 1000);
  const d = Date.parse(value);
  return Number.isFinite(d) ? Math.max(0, d - Date.now()) : undefined;
}

async function fetchJson(url, bucket) {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    await bucket.take();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } });
    } catch (err) {
      clearTimeout(timer);
      if (attempt >= 3) throw new HttpError(`network error: ${err.message}`);
      await sleep(5_000 * attempt);
      continue;
    }
    clearTimeout(timer);
    if (res.status === 429) {
      const retry = parseRetryAfter(res.headers.get('retry-after')) ?? 60_000;
      bucket.pause(retry + 1000);
      log(`  429 – retry after ${(retry / 1000).toFixed(0)} s`);
      if (attempt >= 4) throw new HttpError('rate limited (HTTP 429)', 429, retry);
      continue;
    }
    const text = await res.text();
    if (res.status === 404) throw new HttpError('no content available (HTTP 404)', 404);
    if (res.status >= 500 && attempt < 3) {
      log(`  HTTP ${res.status} – retrying`);
      await sleep(8_000 * attempt);
      continue;
    }
    if (!res.ok) throw new HttpError(`HTTP ${res.status}: ${text.slice(0, 120)}`, res.status);
    try {
      return JSON.parse(text);
    } catch {
      throw new HttpError('invalid JSON');
    }
  }
}

// ---------------------------------------------------------------------------
// Validation + compact encoding
// ---------------------------------------------------------------------------
function assertResponse(raw, context) {
  if (!raw || typeof raw !== 'object') throw new Error(`${context}: not an object`);
  if (!Array.isArray(raw.series)) throw new Error(`${context}: missing series`);
  if (!Array.isArray(raw.data)) throw new Error(`${context}: missing data`);
  if (typeof raw.timezone !== 'string') throw new Error(`${context}: missing timezone`);
  for (const s of raw.series) if (!s || typeof s.id !== 'string') throw new Error(`${context}: invalid series meta`);
}

function roundTo(v, decimals) {
  if (v === null || v === undefined || typeof v !== 'number' || !Number.isFinite(v)) return null;
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Most common delta between consecutive timestamps. */
function majorityStep(ts) {
  const counts = new Map();
  for (let i = 1; i < ts.length; i++) counts.set(ts[i] - ts[i - 1], (counts.get(ts[i] - ts[i - 1]) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [d, c] of counts) if (c > bestCount) [best, bestCount] = [d, c];
  return best;
}

function encodeDataset(spec, raw, fetchedAt) {
  assertResponse(raw, spec.endpoint);
  const records = raw.data
    .map((r) => ({ t: Date.parse(r?.timestamp), values: r?.values && typeof r.values === 'object' ? r.values : {} }))
    .filter((r) => Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t);
  const ts = [];
  for (const r of records) if (ts.length === 0 || ts[ts.length - 1] !== r.t) ts.push(r.t);
  const byT = new Map(records.map((r) => [r.t, r.values]));
  const series = raw.series.map((s) => ({ id: s.id, name: s.name ?? s.id, unit: s.unit ?? null, description: s.description ?? null }));

  let time;
  let grid = ts;
  const step = ts.length > 1 ? majorityStep(ts) : null;
  if (step && step > 0 && ts.every((t) => (t - ts[0]) % step === 0)) {
    const count = Math.round((ts[ts.length - 1] - ts[0]) / step) + 1;
    if (count <= ts.length * 3) {
      // regular grid – fill gaps with nulls
      grid = Array.from({ length: count }, (_, i) => ts[0] + i * step);
      time = { start: ts[0], stepMs: step, count };
    }
  }
  if (!time) time = { timestamps: ts };

  const values = {};
  for (const s of series) values[s.id] = grid.map((t) => roundTo(byT.get(t)?.[s.id], spec.decimals));

  return {
    status: 'ok',
    endpoint: spec.endpoint,
    params: spec.params,
    fetchedAt: new Date(fetchedAt).toISOString(),
    error: null,
    timezone: raw.timezone,
    resolution: raw.resolution ?? null,
    intervalMinutes: raw.interval_minutes ?? null,
    unit: raw.unit ?? null,
    generatedAt: raw.generated_at ?? null,
    availableFrom: raw.available_from ?? null,
    availableUntil: raw.available_until ?? null,
    license: raw.license ?? null,
    attributes: raw.attributes ?? {},
    series,
    time,
    values,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function loadPrevious() {
  try {
    const raw = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    if (raw && raw.schemaVersion === 1 && raw.datasets) return raw;
  } catch {
    /* no previous snapshot */
  }
  return null;
}

async function main() {
  const startedAt = Date.now();
  const previous = await loadPrevious();
  const specs = datasetSpecs(startedAt);
  const datasets = {};
  const errors = [];
  log(`50 Hz of Grey – snapshot update (${new Date(startedAt).toISOString()})`);
  log(`API: ${API_BASE} · ${specs.length} datasets · output ${path.relative(process.cwd(), OUT_FILE)}`);

  for (const spec of specs) {
    const url = `${API_BASE}${spec.endpoint}?${new URLSearchParams(spec.params)}`;
    const fetchedAt = Date.now();
    log(`→ ${spec.key}: ${spec.endpoint} ${JSON.stringify(spec.params)}`);
    try {
      const raw = await fetchJson(url, BUCKETS[spec.budget] ?? BUCKETS.default);
      const ds = encodeDataset(spec, raw, fetchedAt);
      const n = ds.time.count ?? ds.time.timestamps.length;
      datasets[spec.key] = ds;
      log(`  ok – ${ds.series.length} series, ${n} records, until ${ds.availableUntil ?? '–'}`);
    } catch (err) {
      const status = err.status;
      const message = err.message ?? String(err);
      errors.push({ key: spec.key, message, status });
      const prev = previous?.datasets?.[spec.key];
      if (prev && prev.status === 'ok') {
        datasets[spec.key] = { ...prev, error: { status, message } };
        log(`  FAILED (${message}) – keeping previous snapshot from ${prev.fetchedAt}`);
      } else {
        datasets[spec.key] = { status: 'error', endpoint: spec.endpoint, params: spec.params, fetchedAt: new Date(fetchedAt).toISOString(), error: { status, message } };
        log(`  FAILED (${message}) – no previous data`);
      }
    }
  }

  const snapshot = {
    schemaVersion: 1,
    generator: '50hz-of-grey/scripts/update-data.mjs',
    fetchedAt: new Date(startedAt).toISOString(),
    source: {
      name: 'Energy-Charts (Fraunhofer ISE)',
      url: 'https://api.energy-charts.info/',
      license: 'CC BY 4.0, attribution: energy-charts.info; day-ahead prices: Bundesnetzagentur | SMARD.de (CC BY 4.0)',
    },
    datasets,
    errors,
  };
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const json = JSON.stringify(snapshot);
  await writeFile(OUT_FILE, json);
  const ok = Object.values(datasets).filter((d) => d.status === 'ok').length;
  log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(0)} s – ${ok}/${specs.length} datasets ok, ${errors.length} errors, ${(json.length / 1024).toFixed(0)} KB`);
  if (errors.length) log('Errors:', errors.map((e) => `${e.key}: ${e.message}`).join('; '));
  // Always exit 0: a partially failed update must not block the deployment –
  // the app shows data age and errors transparently.
}

main().catch((err) => {
  console.error('Snapshot update failed:', err);
  process.exitCode = 0;
});
