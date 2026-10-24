/**
 * Netz-Wetterbericht: the day-ahead wind and solar forecasts and the
 * day-ahead price, grouped into six-hour blocks of local (Berlin) time.
 * Blocks are built from the timestamps themselves, so DST days just work.
 */
import type { DatasetMap } from '@/types/data';
import { getSeries } from '@/types/data';
import { addDaysToKey, berlinDayKey, zonedParts, MINUTE } from '@/lib/dateUtils';

export type WeatherKind = 'storm' | 'windy' | 'sunny' | 'cloudy' | 'flaute' | 'night' | 'mixed' | 'unknown';

export interface WeatherBlock {
  key: string;
  dayKey: string;
  /** 0: 0–6 h, 1: 6–12 h, 2: 12–18 h, 3: 18–24 h (local time) */
  part: 0 | 1 | 2 | 3;
  start: number;
  end: number;
  /** Means and maxima in GW (null = no forecast for this block). */
  windGw: number | null;
  windMaxGw: number | null;
  solarGw: number | null;
  solarMaxGw: number | null;
  /** Mean day-ahead price in ct/kWh (null = not published yet). */
  priceCt: number | null;
  kind: WeatherKind;
}

/** Thresholds in GW (installed: ~83 GW wind, ~120 GW PV AC). */
export const WEATHER_THRESHOLDS = { storm: 35, windy: 20, sunny: 25, cloudy: 8, flauteWind: 8, flauteSolar: 8, night: 0.5 };

export function weatherKind(windGw: number | null, solarGw: number | null): WeatherKind {
  const T = WEATHER_THRESHOLDS;
  if (windGw === null && solarGw === null) return 'unknown';
  if (windGw !== null && windGw >= T.storm) return 'storm';
  if (solarGw !== null && solarGw >= T.sunny) return 'sunny';
  if (windGw !== null && windGw >= T.windy) return 'windy';
  if (solarGw !== null && solarGw >= T.cloudy) return 'cloudy';
  if (windGw !== null && windGw < T.flauteWind && (solarGw ?? 0) < T.flauteSolar) return 'flaute';
  if (solarGw !== null && solarGw < T.night) return 'night';
  return 'mixed';
}

interface Acc {
  dayKey: string;
  part: 0 | 1 | 2 | 3;
  start: number;
  end: number;
  wind: number[];
  solar: number[];
  price: number[];
}

function seriesMap(ds: DatasetMap[keyof DatasetMap], id: string): Map<number, number> {
  const out = new Map<number, number>();
  const s = ds ? getSeries(ds, id) : undefined;
  if (!ds || !s) return out;
  ds.timestamps.forEach((t, i) => {
    const v = s.values[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) out.set(t, v);
  });
  return out;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const max = (a: number[]) => (a.length ? Math.max(...a) : null);

/** The current and the next blocks that have any data (max `limit`). */
export function buildWeather(datasets: DatasetMap, now: number, limit = 4): WeatherBlock[] {
  const solar = seriesMap(datasets.forecastSolar, 'solar');
  const windOn = seriesMap(datasets.forecastWindOnshore, 'wind_onshore');
  const windOff = seriesMap(datasets.forecastWindOffshore, 'wind_offshore');
  const price = seriesMap(datasets.price, 'day_ahead_price');
  const step = 15 * MINUTE;
  const today = berlinDayKey(now);
  const tomorrow = addDaysToKey(today, 1);

  const times = new Set<number>([...solar.keys(), ...windOn.keys(), ...windOff.keys(), ...price.keys()]);
  const blocks = new Map<string, Acc>();
  for (const t of [...times].sort((a, b) => a - b)) {
    if (t + step <= now) continue; // only what is still to come (incl. the current quarter)
    const dayKey = berlinDayKey(t);
    if (dayKey !== today && dayKey !== tomorrow) continue;
    const part = Math.floor(zonedParts(t).hour / 6) as 0 | 1 | 2 | 3;
    const key = `${dayKey}-${part}`;
    let b = blocks.get(key);
    if (!b) {
      b = { dayKey, part, start: t, end: t + step, wind: [], solar: [], price: [] };
      blocks.set(key, b);
    }
    b.end = t + step;
    const on = windOn.get(t);
    const off = windOff.get(t);
    if (on !== undefined || off !== undefined) b.wind.push(((on ?? 0) + (off ?? 0)) / 1000);
    const s = solar.get(t);
    if (s !== undefined) b.solar.push(s / 1000);
    const p = price.get(t);
    if (p !== undefined) b.price.push(p / 10);
  }

  return [...blocks.entries()]
    .sort((a, b) => a[1].start - b[1].start)
    .map(([key, b]) => {
      const windGw = mean(b.wind);
      const solarGw = mean(b.solar);
      return {
        key,
        dayKey: b.dayKey,
        part: b.part,
        start: b.start,
        end: b.end,
        windGw,
        windMaxGw: max(b.wind),
        solarGw,
        solarMaxGw: max(b.solar),
        priceCt: mean(b.price),
        kind: weatherKind(windGw, solarGw),
      };
    })
    .filter((b) => b.windGw !== null || b.solarGw !== null || b.priceCt !== null)
    .slice(0, limit);
}

const PART_NAME = ['früh', 'Vormittag', 'Nachmittag', 'Abend'] as const;
const PART_HOURS = ['0–6 Uhr', '6–12 Uhr', '12–18 Uhr', '18–24 Uhr'] as const;

export function blockLabel(b: WeatherBlock, now: number): { title: string; hours: string } {
  const day = b.dayKey === berlinDayKey(now) ? 'Heute' : 'Morgen';
  return { title: `${day} ${PART_NAME[b.part]}`, hours: PART_HOURS[b.part] };
}
