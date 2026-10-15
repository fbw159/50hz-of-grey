import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '@/types/data';
import { DataSourceStore, pickFresher, resolveLiveBaseUrl, summarizeOrigins } from './dataSource';
import { clearCachedDatasets, loadCachedDatasets, saveCachedDatasets } from './dataCache';
import { decodeSnapshot } from './snapshotLoader';
import { buildIncidents } from '@/features/incidents/incidentEngine';
import { buildDemoDatasets } from '@/data/demoData';

function ds(partial: Partial<Dataset>): Dataset {
  return {
    key: 'price',
    endpoint: '/v2/price',
    params: {},
    origin: 'live',
    timezone: 'Europe/Berlin',
    resolution: 'PT15M',
    intervalMs: 900_000,
    unit: 'EUR / MWh',
    generatedAt: 0,
    fetchedAt: 0,
    availableFrom: 0,
    availableUntil: 0,
    license: null,
    attributes: {},
    timestamps: [0],
    series: [{ id: 'day_ahead_price', name: 'p', unit: 'EUR / MWh', values: [1] }],
    ...partial,
  };
}

describe('source selection', () => {
  it('prefers the dataset with newer data, then the newer fetch', () => {
    const live = ds({ origin: 'live', availableUntil: 100, fetchedAt: 50 });
    const snap = ds({ origin: 'snapshot', availableUntil: 200, fetchedAt: 10 });
    expect(pickFresher(live, snap)).toBe(snap);
    const snapOld = ds({ origin: 'snapshot', availableUntil: 100, fetchedAt: 10 });
    expect(pickFresher(live, snapOld)).toBe(live);
    expect(pickFresher(undefined, snap)).toBe(snap);
    expect(pickFresher(live, undefined)).toBe(live);
  });

  it('summarises origins (demo always wins when present)', () => {
    expect(summarizeOrigins({ price: ds({ origin: 'snapshot' }), frequency: ds({ origin: 'live' }) }).primary).toBe('live');
    expect(summarizeOrigins({ price: ds({ origin: 'snapshot' }), frequency: ds({ origin: 'demo' }) }).primary).toBe('demo');
    expect(summarizeOrigins({}).primary).toBe('none');
  });

  it('resolves the live base URL from env', () => {
    expect(resolveLiveBaseUrl({ VITE_API_BASE_URL: 'https://proxy.test', DEV: false } as unknown as ImportMetaEnv)).toBe('https://proxy.test');
    expect(resolveLiveBaseUrl({ VITE_API_BASE_URL: '', DEV: true } as unknown as ImportMetaEnv)).toBe('/api/energy-charts');
    expect(resolveLiveBaseUrl({ DEV: false } as unknown as ImportMetaEnv)).toBeUndefined();
  });
});

describe('local cache', () => {
  beforeEach(() => clearCachedDatasets());
  afterEach(() => clearCachedDatasets());

  it('round-trips datasets and marks them as cache', () => {
    expect(saveCachedDatasets({ price: ds({ origin: 'live', fetchedAt: 123 }) }, 999)).toBe(true);
    const loaded = loadCachedDatasets();
    expect(loaded?.savedAt).toBe(999);
    expect(loaded?.datasets.price?.origin).toBe('cache');
    expect(loaded?.datasets.price?.fetchedAt).toBe(123);
  });

  it('never persists demo data', () => {
    saveCachedDatasets({ price: ds({ origin: 'demo' }) });
    expect(loadCachedDatasets()?.datasets.price).toBeUndefined();
  });
});

describe('snapshot decoding', () => {
  it('decodes the file format and skips error datasets', () => {
    const result = decodeSnapshot({
      schemaVersion: 1,
      generator: 'test',
      fetchedAt: '2026-10-15T21:40:00.000Z',
      source: { name: 'x', url: 'y', license: 'z' },
      datasets: {
        price: { status: 'error', endpoint: '/v2/price', params: {}, fetchedAt: '2026-10-15T21:40:00.000Z', error: { message: 'boom' } },
        signal: { status: 'ok', endpoint: '/v2/signal', params: {}, fetchedAt: '2026-10-15T21:40:00.000Z', timezone: 'Europe/Berlin', intervalMinutes: 15, unit: '%', series: [{ id: 'share', name: 's' }], time: { start: 0, stepMs: 900_000, count: 2 }, values: { share: [1, 2] } },
      },
      errors: [{ key: 'price', message: 'boom' }],
    });
    expect(result.datasets.price).toBeUndefined();
    expect(result.datasets.signal?.series[0].values).toEqual([1, 2]);
    expect(result.fetchedAt).toBe(Date.UTC(2026, 9, 15, 21, 40));
    expect(() => decodeSnapshot({ schemaVersion: 2 })).toThrow();
    expect(() => decodeSnapshot(null)).toThrow();
  });
});

describe('DataSourceStore', () => {
  beforeEach(() => clearCachedDatasets());

  it('falls back to the snapshot when no live source is configured', async () => {
    const snapshot = {
      schemaVersion: 1,
      generator: 'test',
      fetchedAt: '2026-10-15T21:40:00.000Z',
      source: { name: 'x', url: 'y', license: 'z' },
      datasets: { signal: { status: 'ok', endpoint: '/v2/signal', params: {}, fetchedAt: '2026-10-15T21:40:00.000Z', timezone: 'Europe/Berlin', intervalMinutes: 15, unit: '%', series: [{ id: 'share', name: 's' }], time: { start: 0, stepMs: 900_000, count: 1 }, values: { share: [55] } } },
      errors: [],
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200 })));
    const store = new DataSourceStore({ now: () => Date.UTC(2026, 9, 15, 22) });
    await store.refresh();
    const state = store.getState();
    expect(state.status).toBe('ready');
    expect(state.datasets.signal?.origin).toBe('snapshot');
    expect(state.liveConfigured).toBe(false);
    vi.unstubAllGlobals();
  });

  it('reports an error state when the snapshot is unavailable and nothing is cached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const store = new DataSourceStore({ now: () => 1 });
    await store.refresh();
    expect(store.getState().status).toBe('error');
    expect(store.getState().snapshotError).toMatch(/500/);
    vi.unstubAllGlobals();
  });

  it('switches to clearly labelled demo data only on request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const store = new DataSourceStore({ now: () => Date.UTC(2026, 9, 15, 12) });
    await store.refresh();
    expect(Object.keys(store.getState().datasets)).toHaveLength(0);
    store.setMode('demo');
    const s = store.getState();
    expect(s.datasets.price?.origin).toBe('demo');
    expect(s.datasets.frequency?.series[0].values.every((v) => v === null || (v > 49.9 && v < 50.1))).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('incident engine', () => {
  it('produces data-driven and clearly marked satire entries', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const datasets = buildDemoDatasets(now);
    const incidents = buildIncidents(datasets, now, 'engineer');
    expect(incidents.some((i) => i.id === 'demo')).toBe(true);
    expect(incidents.some((i) => i.isSatire)).toBe(true);
    expect(incidents.filter((i) => !i.isSatire).every((i) => i.explanation.length > 10)).toBe(true);
    // sorted newest first
    for (let i = 1; i < incidents.length; i++) expect(incidents[i].t).toBeLessThanOrEqual(incidents[i - 1].t);
    expect(buildIncidents(datasets, now, 'professional').some((i) => i.isSatire)).toBe(false);
  });
});
