/**
 * Normalised, source-independent data model used by the UI.
 *
 * Everything the dashboards render is derived from `Dataset`s. A dataset is a
 * column-oriented time series bundle: one timestamp array (epoch ms) and one
 * value array per series, aligned by index. `null` means "no value" – it is
 * NEVER substituted by 0 (0 is a valid measurement, e.g. PV at night).
 */

export type DatasetKey =
  | 'price'
  | 'publicPower'
  | 'frequency'
  | 'signal'
  | 'forecastSolar'
  | 'forecastWindOnshore'
  | 'forecastWindOffshore'
  | 'forecastLoad'
  | 'installedPower';

export const DATASET_KEYS: DatasetKey[] = [
  'price',
  'publicPower',
  'frequency',
  'signal',
  'forecastSolar',
  'forecastWindOnshore',
  'forecastWindOffshore',
  'forecastLoad',
  'installedPower',
];

/** Where a dataset came from. Shown in the UI – data provenance is never hidden. */
export type DataOrigin = 'live' | 'snapshot' | 'cache' | 'demo';

export interface NormalizedSeries {
  id: string;
  name: string;
  /** Unit of this series (series-level unit if present, else dataset unit, else ''). */
  unit: string;
  description?: string;
  /** Aligned with `Dataset.timestamps`. */
  values: (number | null)[];
}

export interface Dataset {
  key: DatasetKey;
  endpoint: string;
  params: Record<string, string>;
  origin: DataOrigin;
  timezone: string;
  resolution: string | null;
  intervalMs: number | null;
  unit: string | null;
  /** API-side generation time (epoch ms). */
  generatedAt: number;
  /** Time the data was fetched from the API (epoch ms) – by the browser or the snapshot job. */
  fetchedAt: number;
  availableFrom: number | null;
  availableUntil: number | null;
  license: string | null;
  attributes: Record<string, unknown>;
  /** Epoch ms, strictly increasing. Each timestamp marks the START of its interval. */
  timestamps: number[];
  series: NormalizedSeries[];
}

export type DatasetMap = Partial<Record<DatasetKey, Dataset>>;

export interface DatasetError {
  key: DatasetKey;
  message: string;
  /** HTTP status if applicable. */
  status?: number;
  at: number;
  /** 404 for not-yet-published data is an expected state, not an error. */
  expected?: boolean;
}

/** Helper: get a series by id (undefined if missing). */
export function getSeries(ds: Dataset | undefined, id: string): NormalizedSeries | undefined {
  return ds?.series.find((s) => s.id === id);
}
