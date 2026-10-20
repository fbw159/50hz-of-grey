/**
 * Public net electricity generation (Energy-Charts "public_power", Germany).
 *
 * Definitions matter here:
 *  - "Öffentliche Nettostromerzeugung" = net generation of power plants that
 *    feed the public grid (industrial self-supply is NOT included).
 *  - "Last" (load) = public net generation + net imports − storage charging …
 *    as provided by Energy-Charts; we never compute our own load.
 *  - Shares use the API's own series (renewable share of load/generation),
 *    so the reference quantity is always explicit.
 */
import type { Dataset, NormalizedSeries } from '@/types/data';
import { getSeries } from '@/types/data';
import { lastValidIndex, rangeIndices, sumAt, valueAt } from '@/lib/timeseries';
import { endOfBerlinDay, startOfBerlinDay, HOUR, MINUTE } from '@/lib/dateUtils';

export type GenerationCategoryId =
  | 'solar'
  | 'windOnshore'
  | 'windOffshore'
  | 'hydro'
  | 'biomass'
  | 'lignite'
  | 'hardCoal'
  | 'gas'
  | 'pumpedStorage'
  | 'other';

export interface GenerationCategory {
  id: GenerationCategoryId;
  label: string;
  /** Series ids of the API that are summed into this category. */
  seriesIds: string[];
  renewable: boolean;
  fossil: boolean;
}

/** Display categories in stacking order (bottom → top). */
export const GENERATION_CATEGORIES: GenerationCategory[] = [
  { id: 'lignite', label: 'Braunkohle', seriesIds: ['fossil_brown_coal_lignite'], renewable: false, fossil: true },
  { id: 'hardCoal', label: 'Steinkohle', seriesIds: ['fossil_hard_coal'], renewable: false, fossil: true },
  { id: 'gas', label: 'Erdgas', seriesIds: ['fossil_gas'], renewable: false, fossil: true },
  { id: 'other', label: 'Sonstige', seriesIds: ['fossil_oil', 'fossil_coal_derived_gas', 'geothermal', 'waste', 'others', 'nuclear'], renewable: false, fossil: false },
  { id: 'pumpedStorage', label: 'Pumpspeicher', seriesIds: ['hydro_pumped_storage'], renewable: false, fossil: false },
  { id: 'biomass', label: 'Biomasse', seriesIds: ['biomass'], renewable: true, fossil: false },
  { id: 'hydro', label: 'Wasserkraft', seriesIds: ['hydro_run_of_river', 'hydro_water_reservoir'], renewable: true, fossil: false },
  { id: 'windOffshore', label: 'Wind Offshore', seriesIds: ['wind_offshore'], renewable: true, fossil: false },
  { id: 'windOnshore', label: 'Wind Onshore', seriesIds: ['wind_onshore'], renewable: true, fossil: false },
  { id: 'solar', label: 'Photovoltaik', seriesIds: ['solar'], renewable: true, fossil: false },
];

export const LOAD_SERIES_ID = 'load';
export const RESIDUAL_LOAD_SERIES_ID = 'residual_load';
export const RENEWABLE_SHARE_OF_LOAD_ID = 'renewable_share_of_load';
export const RENEWABLE_SHARE_OF_GENERATION_ID = 'renewable_share_of_generation';
export const PUMPED_CONSUMPTION_ID = 'hydro_pumped_storage_consumption';
export const CROSS_BORDER_TRADING_ID = 'cross_border_electricity_trading';

export interface GenerationStatus {
  t: number;
  ageMs: number;
  intervalMs: number;
  /** MW per category (null when all contributing series are missing). */
  categories: Record<GenerationCategoryId, number | null>;
  /** Sum of all generation categories in MW. */
  totalGenerationMw: number | null;
  renewableMw: number | null;
  fossilMw: number | null;
  solarMw: number | null;
  windOnshoreMw: number | null;
  windOffshoreMw: number | null;
  windTotalMw: number | null;
  loadMw: number | null;
  residualLoadMw: number | null;
  /** From the API series (measured), in %. */
  renewableShareOfLoad: number | null;
  renewableShareOfGeneration: number | null;
  /** fossil / total generation in %. */
  fossilShareOfGeneration: number | null;
  /** Commercial net import (+) / export (−) in MW – scheduled exchange, not physical flow. */
  netImportMw: number | null;
  pumpedStorageConsumptionMw: number | null;
  /** PV change over the last hour in MW (null if not computable). */
  solarChange1hMw: number | null;
  origin: Dataset['origin'];
  license: string | null;
}

function seriesFor(ds: Dataset, ids: string[]): (NormalizedSeries | undefined)[] {
  return ids.map((id) => getSeries(ds, id));
}

export function categoryValueAt(ds: Dataset, cat: GenerationCategory, index: number): number | null {
  return sumAt(seriesFor(ds, cat.seriesIds), index);
}

/** Index of the newest record that has a real generation value (solar OR wind present). */
export function latestGenerationIndex(ds: Dataset): number {
  const solar = getSeries(ds, 'solar');
  const wind = getSeries(ds, 'wind_onshore');
  const i = Math.max(lastValidIndex(solar?.values ?? []), lastValidIndex(wind?.values ?? []));
  if (i >= 0) return i;
  return ds.timestamps.length - 1;
}

export function getGenerationStatus(ds: Dataset | undefined, now: number): GenerationStatus | null {
  if (!ds || ds.timestamps.length === 0) return null;
  const index = latestGenerationIndex(ds);
  if (index < 0) return null;
  const intervalMs = ds.intervalMs ?? 15 * MINUTE;
  const categories = {} as Record<GenerationCategoryId, number | null>;
  let total: number | null = null;
  let renewable: number | null = null;
  let fossil: number | null = null;
  for (const cat of GENERATION_CATEGORIES) {
    const v = categoryValueAt(ds, cat, index);
    categories[cat.id] = v;
    if (v !== null) {
      total = (total ?? 0) + v;
      if (cat.renewable) renewable = (renewable ?? 0) + v;
      if (cat.fossil) fossil = (fossil ?? 0) + v;
    }
  }
  const solar = categories.solar;
  const windOn = categories.windOnshore;
  const windOff = categories.windOffshore;
  const windTotal = windOn === null && windOff === null ? null : (windOn ?? 0) + (windOff ?? 0);
  const solarSeries = getSeries(ds, 'solar');
  let solarChange1hMw: number | null = null;
  if (solarSeries && solar !== null) {
    const steps = Math.round(HOUR / intervalMs);
    const prev = valueAt(solarSeries, index - steps);
    if (prev !== null && ds.timestamps[index] - ds.timestamps[index - steps] === HOUR) solarChange1hMw = solar - prev;
  }
  return {
    t: ds.timestamps[index],
    ageMs: now - ds.timestamps[index],
    intervalMs,
    categories,
    totalGenerationMw: total,
    renewableMw: renewable,
    fossilMw: fossil,
    solarMw: solar,
    windOnshoreMw: windOn,
    windOffshoreMw: windOff,
    windTotalMw: windTotal,
    loadMw: valueAt(getSeries(ds, LOAD_SERIES_ID), index),
    residualLoadMw: valueAt(getSeries(ds, RESIDUAL_LOAD_SERIES_ID), index),
    renewableShareOfLoad: valueAt(getSeries(ds, RENEWABLE_SHARE_OF_LOAD_ID), index),
    renewableShareOfGeneration: valueAt(getSeries(ds, RENEWABLE_SHARE_OF_GENERATION_ID), index),
    fossilShareOfGeneration: total && fossil !== null ? (fossil / total) * 100 : null,
    netImportMw: valueAt(getSeries(ds, CROSS_BORDER_TRADING_ID), index),
    pumpedStorageConsumptionMw: valueAt(getSeries(ds, PUMPED_CONSUMPTION_ID), index),
    solarChange1hMw,
    origin: ds.origin,
    license: ds.license,
  };
}

export interface GenerationRow {
  t: number;
  values: Record<GenerationCategoryId, number | null>;
  load: number | null;
  renewableShareOfLoad: number | null;
}

/** Rows for a chart over a Berlin calendar day (only intervals that exist in the data). */
export function getGenerationRows(ds: Dataset | undefined, dayKey: string): GenerationRow[] {
  if (!ds) return [];
  const [i0, i1] = rangeIndices(ds.timestamps, startOfBerlinDay(dayKey), endOfBerlinDay(dayKey));
  const rows: GenerationRow[] = [];
  const load = getSeries(ds, LOAD_SERIES_ID);
  const share = getSeries(ds, RENEWABLE_SHARE_OF_LOAD_ID);
  for (let i = i0; i < i1; i++) {
    const values = {} as Record<GenerationCategoryId, number | null>;
    let any = false;
    for (const cat of GENERATION_CATEGORIES) {
      const v = categoryValueAt(ds, cat, i);
      values[cat.id] = v;
      if (v !== null) any = true;
    }
    if (!any) continue;
    rows.push({ t: ds.timestamps[i], values, load: valueAt(load, i), renewableShareOfLoad: valueAt(share, i) });
  }
  return rows;
}

/** Rows for the last `hours` before the newest available record (rolling window). */
export function getRecentGenerationRows(ds: Dataset | undefined, hours: number): GenerationRow[] {
  if (!ds || ds.timestamps.length === 0) return [];
  const last = latestGenerationIndex(ds);
  if (last < 0) return [];
  const to = ds.timestamps[last] + 1;
  const from = ds.timestamps[last] - hours * HOUR;
  const [i0, i1] = rangeIndices(ds.timestamps, from, to);
  const rows: GenerationRow[] = [];
  const load = getSeries(ds, LOAD_SERIES_ID);
  const share = getSeries(ds, RENEWABLE_SHARE_OF_LOAD_ID);
  for (let i = i0; i < i1; i++) {
    const values = {} as Record<GenerationCategoryId, number | null>;
    let any = false;
    for (const cat of GENERATION_CATEGORIES) {
      const v = categoryValueAt(ds, cat, i);
      values[cat.id] = v;
      if (v !== null) any = true;
    }
    if (!any) continue;
    rows.push({ t: ds.timestamps[i], values, load: valueAt(load, i), renewableShareOfLoad: valueAt(share, i) });
  }
  return rows;
}

/** Daily energy per category in GWh (sum of MW × interval) – only for complete-ish days. */
export function dailyEnergyGwh(rows: GenerationRow[], intervalMs: number): Record<GenerationCategoryId, number> {
  const out = {} as Record<GenerationCategoryId, number>;
  const hours = intervalMs / HOUR;
  for (const cat of GENERATION_CATEGORIES) {
    let sum = 0;
    for (const r of rows) {
      const v = r.values[cat.id];
      if (v !== null) sum += v * hours;
    }
    out[cat.id] = sum / 1000;
  }
  return out;
}

/** Days (keys) covered by the dataset, newest first. */
export function coveredDays(ds: Dataset | undefined, dayKeyOf: (t: number) => string): string[] {
  if (!ds) return [];
  const keys = new Set<string>();
  for (const t of ds.timestamps) keys.add(dayKeyOf(t));
  return [...keys].sort().reverse();
}

/* ------------------------------------------------------------------------ */
/* Installed capacity + "who delivers right now" rows for the mix card.      */
/* ------------------------------------------------------------------------ */

export interface InstalledCapacity {
  /** GW (AC side for PV = what can reach the grid). */
  solarGw: number | null;
  windOnshoreGw: number | null;
  windOffshoreGw: number | null;
}

/** Newest installed capacities in GW. Units are declared per series by the API. */
export function getInstalledCapacity(ds: Dataset | undefined): InstalledCapacity {
  const toGw = (id: string): number | null => {
    const s = ds ? getSeries(ds, id) : undefined;
    if (!ds || !s) return null;
    const i = lastValidIndex(s.values);
    if (i < 0) return null;
    const raw = s.values[i] as number;
    const unit = (s.unit || ds.unit || 'GW').toUpperCase();
    return unit.startsWith('MW') ? raw / 1000 : unit.startsWith('KW') ? raw / 1e6 : raw;
  };
  return { solarGw: toGw('solar_ac'), windOnshoreGw: toGw('wind_onshore'), windOffshoreGw: toGw('wind_offshore') };
}

export interface MixRow {
  id: GenerationCategoryId;
  mw: number;
  /** Share of total public net generation in % (0–100). */
  sharePct: number;
  /** Feed-in / installed capacity (0–1) – only for PV and wind. */
  utilisation: number | null;
  renewable: boolean;
}

/** Current generation per category, largest first. Missing categories are left out, zero stays in. */
export function getMixRows(status: GenerationStatus | null, capacity: InstalledCapacity): MixRow[] {
  if (!status || !status.totalGenerationMw || status.totalGenerationMw <= 0) return [];
  const total = status.totalGenerationMw;
  const capFor: Partial<Record<GenerationCategoryId, number | null>> = {
    solar: capacity.solarGw,
    windOnshore: capacity.windOnshoreGw,
    windOffshore: capacity.windOffshoreGw,
  };
  const rows: MixRow[] = [];
  for (const cat of GENERATION_CATEGORIES) {
    const mw = status.categories[cat.id];
    if (mw === null) continue;
    const cap = capFor[cat.id];
    rows.push({
      id: cat.id,
      mw,
      sharePct: (mw / total) * 100,
      utilisation: cap && cap > 0 ? Math.max(0, mw) / (cap * 1000) : null,
      renewable: cat.renewable,
    });
  }
  return rows.sort((a, b) => b.mw - a.mw);
}
