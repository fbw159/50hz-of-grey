/**
 * Day-ahead price metrics (bidding zone DE-LU, EUR/MWh, wholesale market –
 * NOT the household tariff). Intervals come from the dataset (15 min since the
 * day-ahead market switched to quarter hours; 60 min for older data).
 */
import type { Dataset } from '@/types/data';
import { getSeries } from '@/types/data';
import { findIntervalIndex, negativeRuns, rangeIndices, seriesStats, type NegativeRun } from '@/lib/timeseries';
import { addDaysToKey, berlinDayKey, endOfBerlinDay, startOfBerlinDay, MINUTE } from '@/lib/dateUtils';

export const PRICE_SERIES_ID = 'day_ahead_price';
/** Satirical "high price" threshold (EUR/MWh) – a transparent, self-chosen number. */
export const HIGH_PRICE_THRESHOLD = 150;
/** Satirical "low price" threshold (EUR/MWh). */
export const LOW_PRICE_THRESHOLD = 10;

export interface PricePoint {
  t: number;
  /** End of the interval (exclusive). */
  end: number;
  value: number | null;
}

export interface DayPriceStats {
  dayKey: string;
  points: PricePoint[];
  min: number | null;
  max: number | null;
  avg: number | null;
  minT: number | null;
  maxT: number | null;
  count: number;
  /** Expected number of intervals for a full day (23/24/25 h). */
  expectedCount: number;
  negativeCount: number;
  negativeMinutes: number;
  negativeRuns: NegativeRun[];
  complete: boolean;
}

export interface PriceOverview {
  intervalMs: number;
  unit: string;
  current: { value: number; start: number; end: number } | null;
  today: DayPriceStats;
  yesterday: DayPriceStats;
  tomorrow: DayPriceStats | null;
  tomorrowPublished: boolean;
  /** Current price is negative. */
  negativeNow: boolean;
  license: string | null;
  availableUntil: number | null;
  origin: Dataset['origin'];
}

export function dayStats(ds: Dataset, dayKey: string): DayPriceStats {
  const series = getSeries(ds, PRICE_SERIES_ID);
  const intervalMs = ds.intervalMs ?? 15 * MINUTE;
  const start = startOfBerlinDay(dayKey);
  const end = endOfBerlinDay(dayKey);
  const [i0, i1] = rangeIndices(ds.timestamps, start, end);
  const values = series?.values ?? [];
  const points: PricePoint[] = [];
  for (let i = i0; i < i1; i++) points.push({ t: ds.timestamps[i], end: ds.timestamps[i] + intervalMs, value: values[i] ?? null });
  const stats = seriesStats(values, i0, i1);
  const runs = negativeRuns(ds.timestamps, values, intervalMs, i0, i1);
  const negativeCount = runs.reduce((s, r) => s + r.count, 0);
  const expectedCount = Math.round((end - start) / intervalMs);
  return {
    dayKey,
    points,
    min: stats.min,
    max: stats.max,
    avg: stats.avg,
    minT: stats.minIndex >= 0 ? ds.timestamps[stats.minIndex] : null,
    maxT: stats.maxIndex >= 0 ? ds.timestamps[stats.maxIndex] : null,
    count: stats.count,
    expectedCount,
    negativeCount,
    negativeMinutes: (negativeCount * intervalMs) / MINUTE,
    negativeRuns: runs,
    complete: stats.count >= expectedCount,
  };
}

export function getPriceOverview(ds: Dataset | undefined, now: number): PriceOverview | null {
  if (!ds) return null;
  const series = getSeries(ds, PRICE_SERIES_ID);
  if (!series) return null;
  const intervalMs = ds.intervalMs ?? 15 * MINUTE;
  const todayKey = berlinDayKey(now);
  const idx = findIntervalIndex(ds.timestamps, intervalMs, now);
  const currentValue = idx >= 0 ? series.values[idx] : null;
  const current = idx >= 0 && currentValue !== null && currentValue !== undefined ? { value: currentValue, start: ds.timestamps[idx], end: ds.timestamps[idx] + intervalMs } : null;
  const today = dayStats(ds, todayKey);
  const yesterday = dayStats(ds, addDaysToKey(todayKey, -1));
  const tomorrowStats = dayStats(ds, addDaysToKey(todayKey, 1));
  const tomorrowPublished = tomorrowStats.count > 0;
  return {
    intervalMs,
    unit: series.unit || ds.unit || 'EUR / MWh',
    current,
    today,
    yesterday,
    tomorrow: tomorrowPublished ? tomorrowStats : null,
    tomorrowPublished,
    negativeNow: !!current && current.value < 0,
    license: ds.license,
    availableUntil: ds.availableUntil,
    origin: ds.origin,
  };
}

/** Satirical management advice derived from the current price. Clearly labelled as satire in the UI. */
export function priceRegime(value: number | null): 'negative' | 'low' | 'normal' | 'high' | 'unknown' {
  if (value === null || !Number.isFinite(value)) return 'unknown';
  if (value < 0) return 'negative';
  if (value < LOW_PRICE_THRESHOLD) return 'low';
  if (value > HIGH_PRICE_THRESHOLD) return 'high';
  return 'normal';
}
