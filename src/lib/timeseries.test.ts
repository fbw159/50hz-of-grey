import { describe, expect, it } from 'vitest';
import { downsampleMinMax, findIntervalIndex, hashString, lastValidIndex, negativeRuns, seededRandom, seriesStats, sumAt } from './timeseries';

describe('timeseries helpers', () => {
  it('lastValidIndex treats 0 as valid and null as missing', () => {
    expect(lastValidIndex([1, 2, 0, null, null])).toBe(2);
    expect(lastValidIndex([null, null])).toBe(-1);
    expect(lastValidIndex([])).toBe(-1);
  });

  it('finds the interval containing a timestamp', () => {
    const ts = [0, 900, 1800, 2700].map((s) => s * 1000);
    expect(findIntervalIndex(ts, 900_000, 0)).toBe(0);
    expect(findIntervalIndex(ts, 900_000, 899_999)).toBe(0);
    expect(findIntervalIndex(ts, 900_000, 900_000)).toBe(1);
    expect(findIntervalIndex(ts, 900_000, 2_700_000 + 899_999)).toBe(3);
    expect(findIntervalIndex(ts, 900_000, 3_600_000)).toBe(-1); // after the last interval
    expect(findIntervalIndex(ts, 900_000, -1)).toBe(-1);
    expect(findIntervalIndex([], 900_000, 0)).toBe(-1);
  });

  it('computes stats ignoring nulls', () => {
    const s = seriesStats([3, null, -1, 0, 10]);
    expect(s).toMatchObject({ min: -1, max: 10, count: 4, minIndex: 2, maxIndex: 4 });
    expect(s.avg).toBeCloseTo(3);
    expect(seriesStats([null, null]).min).toBeNull();
  });

  it('detects negative price runs with duration', () => {
    const step = 900_000;
    const ts = Array.from({ length: 8 }, (_, i) => i * step);
    const values = [10, -1, -5, -2, 3, -0.5, null, -4];
    const runs = negativeRuns(ts, values, step);
    expect(runs).toHaveLength(3);
    expect(runs[0]).toMatchObject({ start: step, end: 4 * step, count: 3, minValue: -5 });
    expect(runs[1]).toMatchObject({ start: 5 * step, count: 1 });
    expect(runs[2]).toMatchObject({ start: 7 * step, count: 1 });
    // 0 is not negative
    expect(negativeRuns([0, step], [0, 0], step)).toHaveLength(0);
  });

  it('downsamples while preserving extremes', () => {
    const n = 3600;
    const ts = Array.from({ length: n }, (_, i) => i * 1000);
    const values = ts.map((_, i) => 50 + 0.01 * Math.sin(i / 50));
    values[1234] = 50.3; // spike
    values[2222] = 49.7; // dip
    const out = downsampleMinMax(ts, values, 400);
    expect(out.length).toBeLessThanOrEqual(400);
    expect(out.length).toBeGreaterThan(100);
    expect(Math.max(...out.map((s) => s.v))).toBe(50.3);
    expect(Math.min(...out.map((s) => s.v))).toBe(49.7);
    // chronological and only real samples
    for (let i = 1; i < out.length; i++) expect(out[i].t).toBeGreaterThan(out[i - 1].t);
    for (const s of out) expect(values[s.t / 1000]).toBe(s.v);
  });

  it('downsampling passes short series through unchanged (minus nulls)', () => {
    const out = downsampleMinMax([0, 1, 2], [1, null, 3], 100);
    expect(out).toEqual([
      { t: 0, v: 1 },
      { t: 2, v: 3 },
    ]);
  });

  it('sumAt returns null only when every input is missing', () => {
    const a = { id: 'a', name: 'a', unit: 'MW', values: [1, null, null] };
    const b = { id: 'b', name: 'b', unit: 'MW', values: [2, 5, null] };
    expect(sumAt([a, b], 0)).toBe(3);
    expect(sumAt([a, b], 1)).toBe(5);
    expect(sumAt([a, b], 2)).toBeNull();
    expect(sumAt([a, undefined], 0)).toBe(1);
  });

  it('seeded random and hash are deterministic', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    const r1 = seededRandom('x');
    const r2 = seededRandom('x');
    expect(r1()).toBe(r2());
    const v = r1();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
