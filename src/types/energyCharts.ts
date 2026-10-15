/**
 * Raw response types of the Energy-Charts API v2 (api.energy-charts.info).
 *
 * The shapes below follow the published OpenAPI schema (TimeSeriesResponseV2)
 * and were verified against live responses in October 2026.
 */

export interface EcSeriesMeta {
  id: string;
  name: string;
  /** Overrides the response-level unit for this series (e.g. "%" or "GW"). */
  unit?: string | null;
  description?: string | null;
}

export interface EcRecord {
  /** ISO 8601 timestamp WITH utc offset – marks the START of the period. */
  timestamp: string;
  /** Keys are series ids. `null` = not (yet) available. */
  values: Record<string, number | null>;
}

export interface EcTimeSeriesResponse {
  schema_version: string;
  endpoint: string;
  country?: string | null;
  bidding_zone?: string | null;
  /** IANA timezone all timestamps of the response are expressed in. */
  timezone: string;
  /** ISO 8601 duration, e.g. "PT15M"; null if irregular. */
  resolution?: string | null;
  interval_minutes?: number | null;
  /** Default unit of all series – individual series may override it. */
  unit?: string | null;
  generated_at: string;
  available_from?: string | null;
  /** Timestamp of the last record that contains at least one non-null value. */
  available_until?: string | null;
  series: EcSeriesMeta[];
  data: EcRecord[];
  attributes?: Record<string, unknown> | null;
  license?: string | null;
  deprecated: boolean;
}

export type EcForecastProductionType = 'solar' | 'wind_onshore' | 'wind_offshore' | 'load' | 'wind';
export type EcForecastType = 'current' | 'intraday' | 'day-ahead' | 'week-ahead';
