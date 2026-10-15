/**
 * Central Energy-Charts API client.
 *
 * Responsibilities: build requests, enforce a client-side request budget that
 * mirrors the documented server limits (2 req/min, burst 4 – /price: 2/min,
 * burst 2), de-duplicate in-flight requests, cache responses, honour HTTP 429
 * + Retry-After, validate and normalise responses.
 *
 * The UI never talks to this class directly; `dataSource.ts` orchestrates it.
 */
import type { Dataset, DatasetKey } from '@/types/data';
import { normalizeResponse } from './dataAdapters';
import { addDaysToKey, berlinDayKey, MINUTE, HOUR } from '@/lib/dateUtils';

export class ApiError extends Error {
  status?: number;
  retryAfterMs?: number;
  /** true for states that are normal (e.g. tomorrow's prices not yet published). */
  expected: boolean;
  constructor(message: string, opts: { status?: number; retryAfterMs?: number; expected?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
    this.expected = opts.expected ?? false;
  }
}

export interface ApiRequestSpec {
  endpoint: string;
  params: Record<string, string>;
}

export const DE_BIDDING_ZONE = 'DE-LU';
export const DE_COUNTRY = 'de';
export const FREQUENCY_REGION = 'DE-Freiburg';
/** How much frequency history we pull (1-second resolution → 3600 points per hour). */
export const FREQUENCY_WINDOW_MS = 60 * MINUTE;

function isoSeconds(epochMs: number): string {
  return new Date(Math.floor(epochMs / 1000) * 1000).toISOString().replace(/\.000Z$/, 'Z');
}

/** Request parameters for every dataset, derived from "now". */
export function buildRequest(key: DatasetKey, now: number): ApiRequestSpec {
  const today = berlinDayKey(now);
  const yesterday = addDaysToKey(today, -1);
  const tomorrow = addDaysToKey(today, 1);
  switch (key) {
    case 'price':
      return { endpoint: '/v2/price', params: { bzn: DE_BIDDING_ZONE, start: yesterday, end: tomorrow } };
    case 'publicPower':
      return { endpoint: '/v2/public_power', params: { country: DE_COUNTRY, start: addDaysToKey(today, -2), end: today } };
    case 'frequency':
      return {
        endpoint: '/v2/frequency',
        params: { region: FREQUENCY_REGION, start: isoSeconds(now - FREQUENCY_WINDOW_MS), end: isoSeconds(now) },
      };
    case 'signal':
      return { endpoint: '/v2/signal', params: { country: DE_COUNTRY } };
    case 'forecastSolar':
      return { endpoint: '/v2/public_power_forecast', params: { country: DE_COUNTRY, production_type: 'solar', forecast_type: 'day-ahead', start: today, end: tomorrow } };
    case 'forecastWindOnshore':
      return { endpoint: '/v2/public_power_forecast', params: { country: DE_COUNTRY, production_type: 'wind_onshore', forecast_type: 'day-ahead', start: today, end: tomorrow } };
    case 'forecastWindOffshore':
      return { endpoint: '/v2/public_power_forecast', params: { country: DE_COUNTRY, production_type: 'wind_offshore', forecast_type: 'day-ahead', start: today, end: tomorrow } };
    case 'forecastLoad':
      return { endpoint: '/v2/public_power_forecast', params: { country: DE_COUNTRY, production_type: 'load', forecast_type: 'day-ahead', start: today, end: tomorrow } };
    case 'installedPower':
      return { endpoint: '/v2/installed_power', params: { country: DE_COUNTRY, time_step: 'monthly' } };
  }
}

/** Cache lifetime per dataset in direct (live) mode. */
export const DATASET_TTL_MS: Record<DatasetKey, number> = {
  price: 10 * MINUTE,
  publicPower: 10 * MINUTE,
  frequency: 60_000,
  signal: 15 * MINUTE,
  forecastSolar: 30 * MINUTE,
  forecastWindOnshore: 30 * MINUTE,
  forecastWindOffshore: 30 * MINUTE,
  forecastLoad: 30 * MINUTE,
  installedPower: 6 * HOUR,
};

/** Datasets for which a 404 is an expected "not published yet" state. */
const EXPECTED_404: Set<DatasetKey> = new Set(['forecastSolar', 'forecastWindOnshore', 'forecastWindOffshore', 'forecastLoad']);

export function buildUrl(baseUrl: string, spec: ApiRequestSpec): string {
  const qs = new URLSearchParams(spec.params).toString();
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}${spec.endpoint}${qs ? `?${qs}` : ''}`;
}

export function parseRetryAfter(header: string | null, now: number): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - now);
  return undefined;
}

/**
 * Token bucket mirroring the server's documented limits. Requests that would
 * exceed the budget wait (they are not dropped) – and never faster than the
 * bucket allows, so a healthy client cannot trip the server limit by itself.
 */
export class RequestBudget {
  private tokens: number;
  private lastRefill: number;
  private pausedUntil = 0;
  constructor(
    private readonly capacity: number,
    private readonly perMinute: number,
    private readonly clock: () => number = () => Date.now(),
  ) {
    this.tokens = capacity;
    this.lastRefill = clock();
  }
  private refill() {
    const now = this.clock();
    const elapsedMin = (now - this.lastRefill) / MINUTE;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedMin * this.perMinute);
    this.lastRefill = now;
  }
  pause(ms: number) {
    this.pausedUntil = Math.max(this.pausedUntil, this.clock() + ms);
  }
  /** Milliseconds until a token is available (0 = now). */
  waitTime(): number {
    this.refill();
    const now = this.clock();
    const pauseWait = Math.max(0, this.pausedUntil - now);
    if (this.tokens >= 1) return pauseWait;
    const tokenWait = ((1 - this.tokens) / this.perMinute) * MINUTE;
    return Math.max(pauseWait, tokenWait);
  }
  take(): boolean {
    this.refill();
    if (this.clock() < this.pausedUntil) return false;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
  get available(): number {
    this.refill();
    return this.tokens;
  }
}

export interface ClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  clock?: () => number;
  timeoutMs?: number;
  /** Optional: skip waiting for the budget (tests). */
  sleep?: (ms: number) => Promise<void>;
}

interface CacheEntry {
  dataset: Dataset;
  expiresAt: number;
}

export class EnergyChartsClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => number;
  private readonly timeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<Dataset>>();
  private readonly budget: RequestBudget;
  private readonly priceBudget: RequestBudget;
  private queue: Promise<void> = Promise.resolve();

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => fetch(input, init));
    this.clock = opts.clock ?? (() => Date.now());
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.budget = new RequestBudget(4, 2, this.clock);
    this.priceBudget = new RequestBudget(2, 2, this.clock);
  }

  /** Cached dataset (even if expired) – used to show stale data while refreshing. */
  peek(key: DatasetKey, now = this.clock()): Dataset | undefined {
    const url = buildUrl(this.baseUrl, buildRequest(key, now));
    return this.cache.get(url)?.dataset;
  }

  async fetchDataset(key: DatasetKey, now = this.clock(), opts: { force?: boolean } = {}): Promise<Dataset> {
    const spec = buildRequest(key, now);
    const url = buildUrl(this.baseUrl, spec);
    const cached = this.cache.get(url);
    if (cached && !opts.force && cached.expiresAt > this.clock()) return cached.dataset;
    const pending = this.inFlight.get(url);
    if (pending) return pending;

    const run = this.enqueue(async () => {
      const budget = key === 'price' ? this.priceBudget : this.budget;
      // Wait for the budget (serialised through the queue so bursts stay within limits).
      let wait = budget.waitTime();
      while (wait > 0) {
        await this.sleep(Math.min(wait, 60_000));
        wait = budget.waitTime();
      }
      budget.take();
      const fetchedAt = this.clock();
      const raw = await this.httpGetJson(url, key, budget);
      const dataset = normalizeResponse(raw, { key, endpoint: spec.endpoint, params: spec.params, origin: 'live', fetchedAt });
      this.cache.set(url, { dataset, expiresAt: fetchedAt + DATASET_TTL_MS[key] });
      return dataset;
    });
    this.inFlight.set(url, run);
    try {
      return await run;
    } finally {
      this.inFlight.delete(url);
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async httpGetJson(url: string, key: DatasetKey, budget: RequestBudget): Promise<unknown> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : undefined;
    let response: Response;
    try {
      response = await this.fetchImpl(url, { signal: controller?.signal, headers: { Accept: 'application/json' } });
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new ApiError(aborted ? 'Zeitüberschreitung bei der Anfrage' : `Netzwerkfehler: ${(err as Error).message ?? err}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (response.status === 429) {
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'), this.clock()) ?? 60_000;
      budget.pause(retryAfterMs);
      throw new ApiError('Rate limit erreicht (HTTP 429)', { status: 429, retryAfterMs });
    }
    if (response.status === 404) {
      throw new ApiError('Keine Daten für diese Anfrage (HTTP 404)', { status: 404, expected: EXPECTED_404.has(key) });
    }
    if (!response.ok) {
      throw new ApiError(`API-Fehler (HTTP ${response.status})`, { status: response.status });
    }
    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError('Antwort war kein gültiges JSON');
    }
  }
}
