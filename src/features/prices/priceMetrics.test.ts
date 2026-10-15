import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/types/data';
import { startOfBerlinDay } from '@/lib/dateUtils';
import { dayStats, getPriceOverview, priceRegime } from './priceMetrics';

const QUARTER = 15 * 60_000;

function priceDataset(dayKeys: string[], valueFn: (dayIndex: number, i: number) => number | null, fetchedAt = 0): Dataset {
  const timestamps: number[] = [];
  const values: (number | null)[] = [];
  dayKeys.forEach((key, d) => {
    const start = startOfBerlinDay(key);
    const next = startOfBerlinDay(`${key.slice(0, 8)}${String(Number(key.slice(8)) + 1).padStart(2, '0')}`);
    let i = 0;
    for (let t = start; t < next; t += QUARTER) {
      timestamps.push(t);
      values.push(valueFn(d, i++));
    }
  });
  return {
    key: 'price',
    endpoint: '/v2/price',
    params: {},
    origin: 'snapshot',
    timezone: 'Europe/Berlin',
    resolution: 'PT15M',
    intervalMs: QUARTER,
    unit: 'EUR / MWh',
    generatedAt: fetchedAt,
    fetchedAt,
    availableFrom: timestamps[0],
    availableUntil: timestamps[timestamps.length - 1],
    license: 'CC BY 4.0',
    attributes: {},
    timestamps,
    series: [{ id: 'day_ahead_price', name: 'p', unit: 'EUR / MWh', values }],
  };
}

describe('price metrics', () => {
  it('finds the current interval and day statistics', () => {
    const ds = priceDataset(['2026-10-14', '2026-10-15', '2026-10-16'], (d, i) => (d === 1 && i >= 48 && i < 56 ? -10 - i : 50 + d * 10 + (i % 4)));
    const now = Date.UTC(2026, 9, 15, 10, 7); // 12:07 Berlin → interval 12:00–12:15 = index 48 → negative
    const o = getPriceOverview(ds, now)!;
    expect(o.current).not.toBeNull();
    expect(o.current!.start).toBe(Date.UTC(2026, 9, 15, 10, 0));
    expect(o.current!.end).toBe(Date.UTC(2026, 9, 15, 10, 15));
    expect(o.current!.value).toBe(-58);
    expect(o.negativeNow).toBe(true);
    expect(o.today.count).toBe(96);
    expect(o.today.expectedCount).toBe(96);
    expect(o.today.negativeCount).toBe(8);
    expect(o.today.negativeMinutes).toBe(120);
    expect(o.today.negativeRuns).toHaveLength(1);
    expect(o.today.min).toBe(-65);
    expect(o.yesterday.avg).toBeCloseTo(51.5);
    expect(o.tomorrowPublished).toBe(true);
    expect(o.tomorrow!.count).toBe(96);
  });

  it('reports missing tomorrow prices as not published (no error)', () => {
    const ds = priceDataset(['2026-10-14', '2026-10-15'], () => 42);
    const o = getPriceOverview(ds, Date.UTC(2026, 9, 15, 10))!;
    expect(o.tomorrowPublished).toBe(false);
    expect(o.tomorrow).toBeNull();
  });

  it('returns null current price outside the covered range', () => {
    const ds = priceDataset(['2026-10-14'], () => 42);
    const o = getPriceOverview(ds, Date.UTC(2026, 9, 15, 10))!;
    expect(o.current).toBeNull();
    expect(o.today.count).toBe(0);
    expect(o.today.complete).toBe(false);
  });

  it('expects 100 intervals on the 25-hour day and 92 on the 23-hour day', () => {
    const long = priceDataset(['2026-10-25'], () => 1);
    expect(dayStats(long, '2026-10-25').expectedCount).toBe(100);
    expect(dayStats(long, '2026-10-25').count).toBe(100);
    const short = priceDataset(['2026-03-29'], () => 1);
    expect(dayStats(short, '2026-03-29').expectedCount).toBe(92);
    expect(dayStats(short, '2026-03-29').count).toBe(92);
  });

  it('classifies price regimes with explicit thresholds', () => {
    expect(priceRegime(-0.01)).toBe('negative');
    expect(priceRegime(0)).toBe('low');
    expect(priceRegime(9.99)).toBe('low');
    expect(priceRegime(80)).toBe('normal');
    expect(priceRegime(150.01)).toBe('high');
    expect(priceRegime(null)).toBe('unknown');
  });
});
