import { describe, expect, it } from 'vitest';
import { datasetDataAge, datasetFromSnapshot, DataValidationError, inferInterval, normalizeResponse } from './dataAdapters';
import type { SnapshotDataset } from '@/types/snapshot';

const priceResponse = {
  schema_version: '2.0',
  endpoint: 'price',
  country: 'de',
  bidding_zone: 'DE-LU',
  timezone: 'Europe/Berlin',
  resolution: 'PT15M',
  interval_minutes: 15,
  unit: 'EUR / MWh',
  generated_at: '2026-10-15T23:37:27+02:00',
  available_from: '2026-10-15T00:00:00+02:00',
  available_until: '2026-10-15T00:45:00+02:00',
  series: [{ id: 'day_ahead_price', name: 'Day-ahead spot market price' }],
  data: [
    { timestamp: '2026-10-15T00:30:00+02:00', values: { day_ahead_price: 0 } },
    { timestamp: '2026-10-15T00:00:00+02:00', values: { day_ahead_price: 129.44 } },
    { timestamp: '2026-10-15T00:15:00+02:00', values: { day_ahead_price: null } },
    { timestamp: '2026-10-15T00:15:00+02:00', values: { day_ahead_price: 999 } }, // duplicate → ignored
    { timestamp: '2026-10-15T00:45:00+02:00', values: { day_ahead_price: '-14.2' } },
    { timestamp: 'garbage', values: { day_ahead_price: 1 } },
  ],
  attributes: {},
  license: 'CC BY 4.0 (creativecommons.org/licenses/by/4.0) from Bundesnetzagentur | SMARD.de',
  deprecated: false,
};

describe('normalizeResponse', () => {
  it('sorts, de-duplicates and keeps 0 as a value', () => {
    const ds = normalizeResponse(priceResponse, { key: 'price', endpoint: '/v2/price', params: { bzn: 'DE-LU' }, origin: 'live', fetchedAt: 1 });
    expect(ds.timestamps).toEqual([Date.UTC(2026, 9, 14, 22, 0), Date.UTC(2026, 9, 14, 22, 15), Date.UTC(2026, 9, 14, 22, 30), Date.UTC(2026, 9, 14, 22, 45)]);
    expect(ds.series[0].values).toEqual([129.44, null, 0, -14.2]);
    expect(ds.intervalMs).toBe(15 * 60_000);
    expect(ds.unit).toBe('EUR / MWh');
    expect(ds.series[0].unit).toBe('EUR / MWh');
    expect(ds.availableUntil).toBe(Date.UTC(2026, 9, 14, 22, 45));
    expect(ds.license).toContain('CC BY 4.0');
    expect(ds.origin).toBe('live');
  });

  it('respects per-series units (installed power in GW)', () => {
    const ds = normalizeResponse(
      {
        ...priceResponse,
        unit: null,
        interval_minutes: null,
        resolution: 'P1M',
        series: [
          { id: 'solar_ac', name: 'Solar AC', unit: 'GW' },
          { id: 'battery_storage_capacity', name: 'Battery', unit: 'GWh' },
        ],
        data: [{ timestamp: '2026-10-01T00:00:00+02:00', values: { solar_ac: 118.632, battery_storage_capacity: 33.563 } }],
      },
      { key: 'installedPower', endpoint: '/v2/installed_power', params: {}, origin: 'live', fetchedAt: 1 },
    );
    expect(ds.series[0].unit).toBe('GW');
    expect(ds.series[1].unit).toBe('GWh');
    expect(ds.intervalMs).toBeNull();
  });

  it('rejects malformed responses', () => {
    expect(() => normalizeResponse({ foo: 1 }, { key: 'price', endpoint: '/v2/price', params: {}, origin: 'live', fetchedAt: 1 })).toThrow(DataValidationError);
    expect(() => normalizeResponse('no content available', { key: 'price', endpoint: '/v2/price', params: {}, origin: 'live', fetchedAt: 1 })).toThrow(DataValidationError);
    expect(() => normalizeResponse({ ...priceResponse, series: [{ name: 'x' }] }, { key: 'price', endpoint: '/v2/price', params: {}, origin: 'live', fetchedAt: 1 })).toThrow();
  });

  it('infers the interval when metadata is missing', () => {
    expect(inferInterval([0, 1000, 2000, 3000])).toBe(1000);
    expect(inferInterval([0, 900_000, 1_800_000, 1_800_000 + 900_000, 3_600_000])).toBe(900_000);
    expect(inferInterval([5])).toBeNull();
  });
});

describe('datasetFromSnapshot', () => {
  const snap: SnapshotDataset = {
    status: 'ok',
    endpoint: '/v2/frequency',
    params: { region: 'DE-Freiburg' },
    fetchedAt: '2026-10-15T21:40:00.000Z',
    timezone: 'UTC',
    resolution: null,
    intervalMinutes: null,
    unit: 'Hz',
    generatedAt: '2026-10-15T21:39:59+00:00',
    availableFrom: '2026-10-15T21:30:00+00:00',
    availableUntil: '2026-10-15T21:30:03+00:00',
    license: 'CC BY 4.0',
    attributes: { region: 'DE-Freiburg' },
    series: [{ id: 'frequency', name: 'Grid frequency' }],
    time: { start: Date.UTC(2026, 9, 15, 21, 30, 0), stepMs: 1000, count: 4 },
    values: { frequency: [49.9931, null, 49.9862, 49.9795] },
  };

  it('expands a regular grid', () => {
    const ds = datasetFromSnapshot('frequency', snap);
    expect(ds).not.toBeNull();
    expect(ds!.timestamps).toHaveLength(4);
    expect(ds!.timestamps[3] - ds!.timestamps[0]).toBe(3000);
    expect(ds!.series[0].values).toEqual([49.9931, null, 49.9862, 49.9795]);
    expect(ds!.intervalMs).toBe(1000);
    expect(ds!.origin).toBe('snapshot');
    expect(ds!.fetchedAt).toBe(Date.UTC(2026, 9, 15, 21, 40));
  });

  it('supports explicit timestamps and skips broken datasets', () => {
    const ds = datasetFromSnapshot('installedPower', { ...snap, time: { timestamps: [1, 2, 3] }, values: { frequency: [1, 2] } });
    expect(ds!.timestamps).toEqual([1, 2, 3]);
    expect(ds!.series[0].values).toEqual([1, 2, null]);
    expect(datasetFromSnapshot('price', { status: 'error', endpoint: '/v2/price', params: {}, fetchedAt: 'x', error: { message: 'boom' } })).toBeNull();
  });

  it('computes data age from available_until', () => {
    const ds = datasetFromSnapshot('frequency', snap)!;
    expect(datasetDataAge(ds, Date.UTC(2026, 9, 15, 21, 40, 3))).toBe(10 * 60_000);
    expect(datasetDataAge(undefined, 0)).toBe(Infinity);
  });
});
