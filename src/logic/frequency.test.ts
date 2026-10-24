import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/types/data';
import { availableWindows, getFrequencyStatus, getFrequencyWindow } from './frequency';

function freqDataset(values: (number | null)[], start = Date.UTC(2026, 9, 15, 21, 0), origin: Dataset['origin'] = 'snapshot'): Dataset {
  return {
    key: 'frequency',
    endpoint: '/v2/frequency',
    params: { region: 'DE-Freiburg' },
    origin,
    timezone: 'UTC',
    resolution: null,
    intervalMs: 1000,
    unit: 'Hz',
    generatedAt: start,
    fetchedAt: start,
    availableFrom: start,
    availableUntil: start + (values.length - 1) * 1000,
    license: 'CC BY 4.0',
    attributes: { region: 'DE-Freiburg' },
    timestamps: values.map((_, i) => start + i * 1000),
    series: [{ id: 'frequency', name: 'Grid frequency', unit: 'Hz', values }],
  };
}

describe('frequency metrics', () => {
  it('uses the last real measurement, skipping trailing nulls', () => {
    const start = Date.UTC(2026, 9, 15, 21, 0);
    const ds = freqDataset([50.01, 49.987, null, null], start);
    const s = getFrequencyStatus(ds, start + 60_000)!;
    expect(s.value).toBe(49.987);
    expect(s.t).toBe(start + 1000);
    expect(s.ageMs).toBe(59_000);
    expect(s.deviationMilliHz).toBeCloseTo(-13, 6);
    expect(s.stale).toBe(false);
    expect(s.isPerfect).toBe(false);
    expect(s.region).toBe('DE-Freiburg');
  });

  it('flags perfect 50.000 Hz only when rounded to 3 decimals it is exact', () => {
    const start = 0;
    expect(getFrequencyStatus(freqDataset([50.0004], start), 1000)!.isPerfect).toBe(true);
    expect(getFrequencyStatus(freqDataset([50.0006], start), 1000)!.isPerfect).toBe(false);
  });

  it('marks measurements older than six hours as stale', () => {
    const start = 0;
    const ds = freqDataset([50], start);
    expect(getFrequencyStatus(ds, 361 * 60_000)!.stale).toBe(true);
    expect(getFrequencyStatus(ds, 359 * 60_000)!.stale).toBe(false);
  });

  it('returns null without data', () => {
    expect(getFrequencyStatus(undefined, 0)).toBeNull();
    expect(getFrequencyStatus(freqDataset([null, null]), 0)).toBeNull();
  });

  it('builds windows relative to the newest sample with min/max', () => {
    const values = Array.from({ length: 3600 }, (_, i) => 50 + Math.sin(i / 100) * 0.02);
    values[3000] = 50.09;
    const ds = freqDataset(values);
    const w = getFrequencyWindow(ds, 15, 400)!;
    expect(w.count).toBe(901); // 15 min inclusive of both ends
    expect(w.samples.length).toBeLessThanOrEqual(400);
    expect(w.max).toBe(50.09);
    expect(w.maxT).toBe(ds.timestamps[3000]);
    expect(availableWindows(ds)).toEqual([5, 15, 30, 60]);
    expect(availableWindows(freqDataset(values.slice(0, 600)))).toEqual([5]);
  });
});
