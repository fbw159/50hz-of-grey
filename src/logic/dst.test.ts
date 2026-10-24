/**
 * The night of 24/25 October 2026: at 03:00 CEST the clocks go back to 02:00 CET.
 * The price day 2026-10-25 has 25 hours (100 quarter-hours). Everything that
 * groups data by local time must survive this.
 */
import { describe, expect, it } from 'vitest';
import type { Dataset, DatasetKey } from '@/types/data';
import { buildView } from './view';
import { nextHours } from './price';
import { blockLabel } from './weather';
import { berlinDayKey, formatBerlinTime, startOfBerlinDay } from '@/lib/dateUtils';

const Q = 15 * 60_000;

function grid(key: DatasetKey, id: string, start: number, n: number, f: (i: number, t: number) => number, step = Q): Dataset {
  const timestamps = Array.from({ length: n }, (_, i) => start + i * step);
  return {
    key,
    endpoint: '/x',
    params: {},
    origin: 'snapshot',
    timezone: 'Europe/Berlin',
    resolution: step === Q ? 'PT15M' : null,
    intervalMs: step,
    unit: 'MW',
    generatedAt: 0,
    fetchedAt: 0,
    availableFrom: start,
    availableUntil: timestamps[n - 1],
    license: null,
    attributes: {},
    timestamps,
    series: [{ id, name: id, unit: 'MW', values: timestamps.map((t, i) => f(i, t)) }],
  };
}

const day24 = startOfBerlinDay('2026-10-24');
const day26 = startOfBerlinDay('2026-10-26');
const priceN = (startOfBerlinDay('2026-10-27') - day24) / Q; // 96 + 100 + 96

function datasets(now: number) {
  return {
    price: grid('price', 'day_ahead_price', day24, priceN, (i) => 50 + (i % 100)),
    frequency: grid('frequency', 'frequency', now - 20 * 60_000, 20 * 60, (i) => 50 + 0.01 * Math.sin(i / 30), 1000),
    forecastSolar: grid('forecastSolar', 'solar', day24, priceN, () => 0),
    forecastWindOnshore: grid('forecastWindOnshore', 'wind_onshore', day24, priceN, () => 20_000),
  };
}

describe('daylight saving switch on 25 October 2026', () => {
  it('has 25 hours and 100 quarter-hours on the switch day', () => {
    expect(day26 - startOfBerlinDay('2026-10-25')).toBe(25 * 3_600_000);
    expect(priceN).toBe(96 + 100 + 96);
  });

  for (const [label, utc] of [
    ['01:30 CEST', Date.UTC(2026, 9, 24, 23, 30)],
    ['02:30 CEST', Date.UTC(2026, 9, 25, 0, 30)],
    ['02:30 CET (the repeated hour)', Date.UTC(2026, 9, 25, 1, 30)],
    ['12:00 CET', Date.UTC(2026, 9, 25, 11, 0)],
    ['23:50 CET', Date.UTC(2026, 9, 25, 22, 50)],
  ] as const) {
    it(`builds a consistent view at ${label}`, () => {
      const v = buildView(datasets(utc), utc);
      expect(berlinDayKey(utc)).toBe('2026-10-25');
      // the current quarter-hour is found and the price is the one of that quarter
      expect(v.price?.current).not.toBeNull();
      expect(v.price!.current!.start).toBeLessThanOrEqual(utc);
      expect(v.price!.current!.end).toBeGreaterThan(utc);
      // today has 25 hourly bars, tomorrow 24
      expect(v.today?.hours).toHaveLength(25);
      expect(v.tomorrow?.hours).toHaveLength(24);
      // the next-24-hours tip never contains an hour twice and starts with the running hour
      const next = nextHours([v.today?.hours, v.tomorrow?.hours], utc);
      expect(new Set(next.map((h) => h.start)).size).toBe(next.length);
      expect(next[0].start).toBeLessThanOrEqual(utc);
      expect(next.length).toBeGreaterThanOrEqual(24);
      // weather blocks are in order, don't overlap and have sensible labels
      expect(v.weather.length).toBeGreaterThan(0);
      for (let i = 1; i < v.weather.length; i++) expect(v.weather[i].start).toBeGreaterThanOrEqual(v.weather[i - 1].end);
      for (const b of v.weather) expect(blockLabel(b, utc).title).toMatch(/^(Heute|Morgen) /);
      expect(v.headline).not.toBeNull();
      expect(v.panic).not.toBeNull();
    });
  }

  it('labels the repeated hour twice as 02 Uhr, which is correct local time', () => {
    const v = buildView(datasets(Date.UTC(2026, 9, 25, 11)), Date.UTC(2026, 9, 25, 11));
    const labels = v.today!.hours.map((h) => formatBerlinTime(h.start).slice(0, 2));
    expect(labels.slice(0, 5)).toEqual(['00', '01', '02', '02', '03']);
  });
});
