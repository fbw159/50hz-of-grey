/**
 * Frequency metrics. The frequency series is a measurement of the
 * Continental-Europe synchronous area, taken at Fraunhofer ISE in Freiburg,
 * at 1-second resolution. Nothing here is interpolated or smoothed.
 */
import type { Dataset } from '@/types/data';
import { getSeries } from '@/types/data';
import { lastValid, downsampleMinMax, seriesStats, rangeIndices, type Sample } from '@/lib/timeseries';
import { MINUTE } from '@/lib/dateUtils';

export const NOMINAL_FREQUENCY = 50;
export const FREQUENCY_SERIES_ID = 'frequency';

export interface FrequencyStatus {
  /** Latest measured frequency in Hz. */
  value: number;
  /** Timestamp of that measurement (epoch ms). */
  t: number;
  ageMs: number;
  /** f − 50 Hz in Hz. */
  deviationHz: number;
  deviationMilliHz: number;
  /**
   * Deviation in whole mHz, consistent with the value shown with three
   * decimals (49,981 Hz ↔ −19 mHz). Use this for every text.
   */
  roundedMilliHz: number;
  /** Measurement meta from the dataset. */
  region: string;
  synchronousArea: string;
  origin: Dataset['origin'];
  /** Rounded to 3 decimals the value is exactly 50.000 Hz (easter egg trigger). */
  isPerfect: boolean;
  /** True when the measurement is older than `staleAfterMs`. */
  stale: boolean;
}

/**
 * The snapshot is refreshed by GitHub Actions, which in practice runs every
 * 30–60 minutes (sometimes longer at night). A measurement only stops counting
 * as "current" after three hours; until then it is shown with its age.
 */
export const FREQUENCY_STALE_AFTER_MS = 3 * 60 * MINUTE;

export function getFrequencyStatus(ds: Dataset | undefined, now: number): FrequencyStatus | null {
  const last = lastValid(ds, FREQUENCY_SERIES_ID);
  if (!last || !ds) return null;
  const deviationHz = last.v - NOMINAL_FREQUENCY;
  const region = typeof ds.attributes.region === 'string' ? ds.attributes.region : ds.params.region ?? 'DE-Freiburg';
  return {
    value: last.v,
    t: last.t,
    ageMs: now - last.t,
    deviationHz,
    deviationMilliHz: deviationHz * 1000,
    roundedMilliHz: Math.round(last.v * 1000) - NOMINAL_FREQUENCY * 1000,
    region,
    synchronousArea: 'RG Kontinentaleuropa',
    origin: ds.origin,
    isPerfect: Math.round(last.v * 1000) === NOMINAL_FREQUENCY * 1000,
    stale: now - last.t > FREQUENCY_STALE_AFTER_MS,
  };
}

export interface FrequencyWindow {
  windowMinutes: number;
  /** Downsampled real samples for charting. */
  samples: Sample[];
  min: number | null;
  max: number | null;
  avg: number | null;
  minT: number | null;
  maxT: number | null;
  count: number;
  from: number;
  to: number;
}

/**
 * The last `windowMinutes` of measurements relative to the newest sample
 * (not relative to the clock – the data may lag the clock by minutes).
 */
export function getFrequencyWindow(ds: Dataset | undefined, windowMinutes: number, maxPoints = 480): FrequencyWindow | null {
  const series = getSeries(ds, FREQUENCY_SERIES_ID);
  const last = lastValid(ds, FREQUENCY_SERIES_ID);
  if (!ds || !series || !last) return null;
  const to = last.t + 1;
  const from = last.t - windowMinutes * MINUTE;
  const [i0, i1] = rangeIndices(ds.timestamps, from, to);
  const stats = seriesStats(series.values, i0, i1);
  return {
    windowMinutes,
    samples: downsampleMinMax(ds.timestamps, series.values, maxPoints, i0, i1),
    min: stats.min,
    max: stats.max,
    avg: stats.avg,
    minT: stats.minIndex >= 0 ? ds.timestamps[stats.minIndex] : null,
    maxT: stats.maxIndex >= 0 ? ds.timestamps[stats.maxIndex] : null,
    count: stats.count,
    from,
    to,
  };
}

/** Available window options, limited by the data actually present. */
export function availableWindows(ds: Dataset | undefined): number[] {
  const options = [5, 15, 30, 60];
  if (!ds || ds.timestamps.length < 2) return options;
  const spanMinutes = (ds.timestamps[ds.timestamps.length - 1] - ds.timestamps[0]) / MINUTE;
  const fitting = options.filter((o) => o <= spanMinutes + 1);
  return fitting.length ? fitting : [options[0]];
}
