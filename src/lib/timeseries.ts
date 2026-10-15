/**
 * Pure time-series helpers. All functions treat `null` as "missing" and never
 * invent values. 0 is a valid measurement.
 */
import type { Dataset, NormalizedSeries } from '@/types/data';

export interface TimedValue {
  t: number;
  v: number;
  index: number;
}

/** Index of the last non-null value (−1 if none). */
export function lastValidIndex(values: (number | null)[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) return i;
  }
  return -1;
}

/** Last non-null value of a series in a dataset, with its timestamp. */
export function lastValid(ds: Dataset | undefined, seriesId: string): TimedValue | null {
  if (!ds) return null;
  const s = ds.series.find((x) => x.id === seriesId);
  if (!s) return null;
  const i = lastValidIndex(s.values);
  if (i < 0) return null;
  return { t: ds.timestamps[i], v: s.values[i] as number, index: i };
}

/** Value of a series at a given index (null if missing). */
export function valueAt(series: NormalizedSeries | undefined, index: number): number | null {
  if (!series || index < 0 || index >= series.values.length) return null;
  const v = series.values[index];
  return v === undefined ? null : v;
}

/**
 * Index of the interval that contains `now`: t_i ≤ now < t_i + intervalMs.
 * Returns −1 if `now` is outside the covered range.
 */
export function findIntervalIndex(timestamps: number[], intervalMs: number, now: number): number {
  if (timestamps.length === 0) return -1;
  // binary search for the last timestamp ≤ now
  let lo = 0;
  let hi = timestamps.length - 1;
  if (now < timestamps[0]) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timestamps[mid] <= now) lo = mid;
    else hi = mid - 1;
  }
  return now < timestamps[lo] + intervalMs ? lo : -1;
}

/** Indices [from, to) with timestamps in [fromT, toT). */
export function rangeIndices(timestamps: number[], fromT: number, toT: number): [number, number] {
  let from = 0;
  while (from < timestamps.length && timestamps[from] < fromT) from++;
  let to = from;
  while (to < timestamps.length && timestamps[to] < toT) to++;
  return [from, to];
}

export interface SeriesStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  minIndex: number;
  maxIndex: number;
  count: number;
}

export function seriesStats(values: (number | null)[], from = 0, to = values.length): SeriesStats {
  let min: number | null = null;
  let max: number | null = null;
  let sum = 0;
  let count = 0;
  let minIndex = -1;
  let maxIndex = -1;
  for (let i = from; i < to; i++) {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    if (min === null || v < min) {
      min = v;
      minIndex = i;
    }
    if (max === null || v > max) {
      max = v;
      maxIndex = i;
    }
    sum += v;
    count++;
  }
  return { min, max, avg: count ? sum / count : null, minIndex, maxIndex, count };
}

export interface NegativeRun {
  start: number;
  end: number; // exclusive end (start of first non-negative interval)
  count: number;
  minValue: number;
}

/** Contiguous runs of negative values (strictly < 0). */
export function negativeRuns(timestamps: number[], values: (number | null)[], intervalMs: number, from = 0, to = values.length): NegativeRun[] {
  const runs: NegativeRun[] = [];
  let current: NegativeRun | null = null;
  for (let i = from; i < to; i++) {
    const v = values[i];
    const negative = v !== null && v !== undefined && v < 0;
    if (negative) {
      if (current && timestamps[i] === current.end) {
        current.end = timestamps[i] + intervalMs;
        current.count++;
        current.minValue = Math.min(current.minValue, v);
      } else {
        current = { start: timestamps[i], end: timestamps[i] + intervalMs, count: 1, minValue: v };
        runs.push(current);
      }
    } else {
      current = null;
    }
  }
  return runs;
}

export interface Sample {
  t: number;
  v: number;
}

/**
 * Downsample to at most ~maxPoints while preserving extremes: every bucket
 * contributes its first, min, max and last REAL sample (in chronological
 * order). Nothing is interpolated.
 */
export function downsampleMinMax(timestamps: number[], values: (number | null)[], maxPoints: number, from = 0, to = values.length): Sample[] {
  const n = Math.max(0, to - from);
  const out: Sample[] = [];
  if (n === 0) return out;
  const buckets = Math.max(1, Math.floor(maxPoints / 4));
  if (n <= maxPoints) {
    for (let i = from; i < to; i++) {
      const v = values[i];
      if (v !== null && v !== undefined && Number.isFinite(v)) out.push({ t: timestamps[i], v });
    }
    return out;
  }
  const size = n / buckets;
  for (let b = 0; b < buckets; b++) {
    const bStart = from + Math.floor(b * size);
    const bEnd = b === buckets - 1 ? to : from + Math.floor((b + 1) * size);
    let first: Sample | null = null;
    let last: Sample | null = null;
    let min: Sample | null = null;
    let max: Sample | null = null;
    for (let i = bStart; i < bEnd; i++) {
      const v = values[i];
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      const s = { t: timestamps[i], v };
      if (!first) first = s;
      last = s;
      if (!min || v < min.v) min = s;
      if (!max || v > max.v) max = s;
    }
    if (!first || !last || !min || !max) continue;
    const picked = [first, min, max, last].sort((a, b2) => a.t - b2.t);
    for (const p of picked) {
      if (out.length === 0 || out[out.length - 1].t !== p.t) out.push(p);
    }
  }
  return out;
}

/** Sum of several series at an index; null if ALL inputs are null (missing ≠ 0). */
export function sumAt(seriesList: (NormalizedSeries | undefined)[], index: number): number | null {
  let sum = 0;
  let any = false;
  for (const s of seriesList) {
    const v = valueAt(s, index);
    if (v !== null) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

/** Simple, deterministic 32-bit string hash (FNV-1a). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pseudo random in [0,1) from a seed string (mulberry32). */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
