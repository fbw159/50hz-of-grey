/**
 * Adapters: raw API responses / snapshot files → normalised Datasets.
 * This is the only place that knows the Energy-Charts response structure.
 */
import type { EcTimeSeriesResponse } from '@/types/energyCharts';
import type { DataOrigin, Dataset, DatasetKey, NormalizedSeries } from '@/types/data';
import type { SnapshotDataset } from '@/types/snapshot';
import { parseIso, parseIsoDuration, MINUTE } from '@/lib/dateUtils';

export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataValidationError';
  }
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Structural validation of a v2 response. Throws DataValidationError. */
export function assertTimeSeriesResponse(raw: unknown, context: string): asserts raw is EcTimeSeriesResponse {
  if (!isRecord(raw)) throw new DataValidationError(`${context}: response is not an object`);
  if (!Array.isArray(raw.series)) throw new DataValidationError(`${context}: missing "series" array`);
  if (!Array.isArray(raw.data)) throw new DataValidationError(`${context}: missing "data" array`);
  if (typeof raw.timezone !== 'string') throw new DataValidationError(`${context}: missing "timezone"`);
  for (const s of raw.series as unknown[]) {
    if (!isRecord(s) || typeof s.id !== 'string') throw new DataValidationError(`${context}: invalid series meta`);
  }
}

export interface NormalizeOptions {
  key: DatasetKey;
  endpoint: string;
  params: Record<string, string>;
  origin: DataOrigin;
  fetchedAt: number;
}

/**
 * Convert an API response to a Dataset. Records are sorted by time and
 * de-duplicated; values that are not finite numbers become null.
 */
export function normalizeResponse(raw: unknown, opts: NormalizeOptions): Dataset {
  assertTimeSeriesResponse(raw, opts.endpoint);
  const defaultUnit = typeof raw.unit === 'string' ? raw.unit : null;

  const records: { t: number; values: Record<string, unknown> }[] = [];
  for (const r of raw.data as unknown[]) {
    if (!isRecord(r)) continue;
    const t = parseIso(typeof r.timestamp === 'string' ? r.timestamp : undefined);
    if (t === null) continue;
    records.push({ t, values: isRecord(r.values) ? r.values : {} });
  }
  records.sort((a, b) => a.t - b.t);

  const timestamps: number[] = [];
  const seriesValues = new Map<string, (number | null)[]>();
  for (const s of raw.series) seriesValues.set(s.id, []);

  for (const rec of records) {
    if (timestamps.length && timestamps[timestamps.length - 1] === rec.t) continue; // duplicate timestamp
    timestamps.push(rec.t);
    for (const [id, arr] of seriesValues) arr.push(toNumberOrNull(rec.values[id]));
  }

  const series: NormalizedSeries[] = raw.series.map((s) => ({
    id: s.id,
    name: s.name ?? s.id,
    unit: (typeof s.unit === 'string' && s.unit) || defaultUnit || '',
    description: typeof s.description === 'string' ? s.description : undefined,
    values: seriesValues.get(s.id) ?? [],
  }));

  const intervalFromMeta = typeof raw.interval_minutes === 'number' && raw.interval_minutes > 0 ? raw.interval_minutes * MINUTE : null;
  const intervalMs = intervalFromMeta ?? parseIsoDuration(raw.resolution) ?? inferInterval(timestamps);

  return {
    key: opts.key,
    endpoint: opts.endpoint,
    params: opts.params,
    origin: opts.origin,
    timezone: raw.timezone,
    resolution: raw.resolution ?? null,
    intervalMs,
    unit: defaultUnit,
    generatedAt: parseIso(raw.generated_at) ?? opts.fetchedAt,
    fetchedAt: opts.fetchedAt,
    availableFrom: parseIso(raw.available_from ?? undefined),
    availableUntil: parseIso(raw.available_until ?? undefined),
    license: typeof raw.license === 'string' ? raw.license : null,
    attributes: isRecord(raw.attributes) ? raw.attributes : {},
    timestamps,
    series,
  };
}

/** Infer a regular interval from the most common timestamp delta (null if < 2 points). */
export function inferInterval(timestamps: number[]): number | null {
  if (timestamps.length < 2) return null;
  const counts = new Map<number, number>();
  for (let i = 1; i < timestamps.length; i++) {
    const d = timestamps[i] - timestamps[i - 1];
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [d, c] of counts) {
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/** Decode a snapshot dataset into a Dataset (origin "snapshot"). Returns null for error/empty datasets. */
export function datasetFromSnapshot(key: DatasetKey, snap: SnapshotDataset): Dataset | null {
  if (snap.status !== 'ok' || !snap.series || !snap.time || !snap.values) return null;
  let timestamps: number[];
  if ('timestamps' in snap.time) {
    timestamps = snap.time.timestamps.filter((t) => Number.isFinite(t));
  } else {
    const { start, stepMs, count } = snap.time;
    timestamps = Array.from({ length: count }, (_, i) => start + i * stepMs);
  }
  const defaultUnit = snap.unit ?? null;
  const series: NormalizedSeries[] = snap.series.map((s) => {
    const raw = snap.values?.[s.id] ?? [];
    const values = timestamps.map((_, i) => toNumberOrNull(raw[i]));
    return {
      id: s.id,
      name: s.name ?? s.id,
      unit: (typeof s.unit === 'string' && s.unit) || defaultUnit || '',
      description: typeof s.description === 'string' ? s.description : undefined,
      values,
    };
  });
  const fetchedAt = parseIso(snap.fetchedAt) ?? Date.now();
  const intervalMs = (typeof snap.intervalMinutes === 'number' && snap.intervalMinutes > 0 ? snap.intervalMinutes * MINUTE : null) ?? parseIsoDuration(snap.resolution) ?? inferInterval(timestamps);
  return {
    key,
    endpoint: snap.endpoint,
    params: snap.params ?? {},
    origin: 'snapshot',
    timezone: snap.timezone ?? 'Europe/Berlin',
    resolution: snap.resolution ?? null,
    intervalMs,
    unit: defaultUnit,
    generatedAt: parseIso(snap.generatedAt) ?? fetchedAt,
    fetchedAt,
    availableFrom: parseIso(snap.availableFrom ?? undefined),
    availableUntil: parseIso(snap.availableUntil ?? undefined),
    license: snap.license ?? null,
    attributes: snap.attributes ?? {},
    timestamps,
    series,
  };
}

/** Age of the newest real value in the dataset, in ms (Infinity if none). */
export function datasetDataAge(ds: Dataset | undefined, now: number): number {
  if (!ds) return Infinity;
  const until = ds.availableUntil ?? (ds.timestamps.length ? ds.timestamps[ds.timestamps.length - 1] : null);
  return until === null ? Infinity : now - until;
}
