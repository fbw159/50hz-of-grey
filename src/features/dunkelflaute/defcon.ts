/**
 * DUNKELFLAUTE DEFCON – a satirical, self-defined heuristic.
 *
 * It is NOT an official classification and low wind+solar feed-in is NOT a
 * grid-stability indicator. The heuristic looks at the combined wind + solar
 * feed-in relative to installed capacity (capacity factor) AND at how long
 * it has been low, because a single value says nothing about a Dunkelflaute.
 */
import type { Dataset } from '@/types/data';
import { getSeries } from '@/types/data';
import { lastValidIndex, sumAt, valueAt } from '@/lib/timeseries';
import { HOUR, MINUTE } from '@/lib/dateUtils';

export type DefconLevel = 1 | 2 | 3 | 4 | 5;

export interface DefconThresholds {
  /** capacity factor (0–1) above which we are at level 5 … */
  level5: number;
  level4: number;
  level3: number;
  level2: number;
  /** Hours of sustained low feed-in (< lowCf) that escalate by one level. */
  sustainedHours: number;
  lowCf: number;
}

export const DEFCON_THRESHOLDS: DefconThresholds = {
  level5: 0.3,
  level4: 0.2,
  level3: 0.12,
  level2: 0.06,
  sustainedHours: 3,
  lowCf: 0.1,
};

export interface InstalledCapacity {
  /** GW */
  solarGw: number | null;
  windOnshoreGw: number | null;
  windOffshoreGw: number | null;
  /** Reference month (epoch ms of the period). */
  t: number | null;
  totalVreGw: number | null;
}

/** Newest installed capacities (GW). Series units are declared per series by the API. */
export function getInstalledCapacity(ds: Dataset | undefined): InstalledCapacity {
  const empty: InstalledCapacity = { solarGw: null, windOnshoreGw: null, windOffshoreGw: null, t: null, totalVreGw: null };
  if (!ds) return empty;
  const toGw = (id: string): { v: number | null; t: number | null } => {
    const s = getSeries(ds, id);
    if (!s) return { v: null, t: null };
    const i = lastValidIndex(s.values);
    if (i < 0) return { v: null, t: null };
    const raw = s.values[i] as number;
    const unit = (s.unit || ds.unit || 'GW').toUpperCase();
    const v = unit.startsWith('MW') ? raw / 1000 : unit.startsWith('KW') ? raw / 1e6 : raw;
    return { v, t: ds.timestamps[i] };
  };
  const solar = toGw('solar_ac'); // AC side = what reaches the grid
  const windOn = toGw('wind_onshore');
  const windOff = toGw('wind_offshore');
  const parts = [solar.v, windOn.v, windOff.v].filter((v): v is number => v !== null);
  return {
    solarGw: solar.v,
    windOnshoreGw: windOn.v,
    windOffshoreGw: windOff.v,
    t: solar.t ?? windOn.t ?? windOff.t,
    totalVreGw: parts.length ? parts.reduce((a, b) => a + b, 0) : null,
  };
}

export interface DefconSample {
  t: number;
  windMw: number | null;
  solarMw: number | null;
  vreMw: number | null;
  /** capacity factor 0–1 (null if capacity unknown). */
  cf: number | null;
}

export interface DefconStatus {
  level: DefconLevel;
  /** current capacity factor (0–1). */
  cf: number | null;
  windMw: number | null;
  solarMw: number | null;
  vreMw: number | null;
  /** Normalised feed-in relative to installed capacity. */
  windCf: number | null;
  solarCf: number | null;
  /** Hours (from the newest sample backwards) with cf < lowCf. */
  lowHours: number;
  escalated: boolean;
  t: number;
  ageMs: number;
  samples: DefconSample[];
  capacity: InstalledCapacity;
  thresholds: DefconThresholds;
}

export function defconFromCf(cf: number | null, lowHours: number, th: DefconThresholds = DEFCON_THRESHOLDS): { level: DefconLevel; escalated: boolean } {
  if (cf === null) return { level: 3, escalated: false };
  let level: DefconLevel = cf >= th.level5 ? 5 : cf >= th.level4 ? 4 : cf >= th.level3 ? 3 : cf >= th.level2 ? 2 : 1;
  let escalated = false;
  if (lowHours >= th.sustainedHours && level > 1) {
    level = (level - 1) as DefconLevel;
    escalated = true;
  }
  return { level, escalated };
}

/**
 * @param publicPower measured public net generation
 * @param installed installed power (monthly)
 * @param now clock
 * @param lookbackHours how many hours of samples to include
 */
export function getDefconStatus(publicPower: Dataset | undefined, installed: Dataset | undefined, now: number, lookbackHours = 24, th: DefconThresholds = DEFCON_THRESHOLDS): DefconStatus | null {
  if (!publicPower || publicPower.timestamps.length === 0) return null;
  const capacity = getInstalledCapacity(installed);
  const capMw = capacity.totalVreGw !== null ? capacity.totalVreGw * 1000 : null;
  const solarS = getSeries(publicPower, 'solar');
  const windOnS = getSeries(publicPower, 'wind_onshore');
  const windOffS = getSeries(publicPower, 'wind_offshore');
  const lastIdx = Math.max(lastValidIndex(solarS?.values ?? []), lastValidIndex(windOnS?.values ?? []));
  if (lastIdx < 0) return null;
  const intervalMs = publicPower.intervalMs ?? 15 * MINUTE;
  const from = publicPower.timestamps[lastIdx] - lookbackHours * HOUR;
  const samples: DefconSample[] = [];
  for (let i = 0; i <= lastIdx; i++) {
    const t = publicPower.timestamps[i];
    if (t < from) continue;
    const wind = sumAt([windOnS, windOffS], i);
    const solar = valueAt(solarS, i);
    const vre = wind === null && solar === null ? null : (wind ?? 0) + (solar ?? 0);
    samples.push({ t, windMw: wind, solarMw: solar, vreMw: vre, cf: vre !== null && capMw ? vre / capMw : null });
  }
  const latest = samples[samples.length - 1];
  if (!latest) return null;
  // sustained low feed-in: count consecutive samples from the end with cf < lowCf
  let lowHours = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    const cf = samples[i].cf;
    if (cf !== null && cf < th.lowCf) lowHours += intervalMs / HOUR;
    else break;
  }
  const { level, escalated } = defconFromCf(latest.cf, lowHours, th);
  const windCap = (capacity.windOnshoreGw ?? 0) + (capacity.windOffshoreGw ?? 0);
  return {
    level,
    cf: latest.cf,
    windMw: latest.windMw,
    solarMw: latest.solarMw,
    vreMw: latest.vreMw,
    windCf: latest.windMw !== null && windCap > 0 ? latest.windMw / (windCap * 1000) : null,
    solarCf: latest.solarMw !== null && capacity.solarGw ? latest.solarMw / (capacity.solarGw * 1000) : null,
    lowHours,
    escalated,
    t: latest.t,
    ageMs: now - latest.t,
    samples,
    capacity,
    thresholds: th,
  };
}

export const DEFCON_TEXT: Record<DefconLevel, { title: string; satire: string; tone: 'ok' | 'info' | 'warn' | 'critical' }> = {
  5: { title: 'DEFCON 5', satire: 'Sonne und Wind sind heute motivierter als die Personalabteilung.', tone: 'ok' },
  4: { title: 'DEFCON 4', satire: 'Leichte atmosphärische Arbeitsverweigerung.', tone: 'info' },
  3: { title: 'DEFCON 3', satire: 'Windpark hat Homeoffice beantragt.', tone: 'warn' },
  2: { title: 'DEFCON 2', satire: 'Die Residuallast meldet sich zurück.', tone: 'warn' },
  1: { title: 'DEFCON 1', satire: 'Bitte das Wetter freundlich um mehr Leistung bitten.', tone: 'critical' },
};
