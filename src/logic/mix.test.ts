import { describe, expect, it } from 'vitest';
import type { Dataset, NormalizedSeries } from '@/types/data';
import { getGenerationStatus, getGenerationRows, dailyEnergyGwh, getRecentGenerationRows, getInstalledCapacity, getMixRows } from './mix';
import { startOfBerlinDay } from '@/lib/dateUtils';

const QUARTER = 15 * 60_000;

function pp(seriesValues: Record<string, (number | null)[]>, start = startOfBerlinDay('2026-10-15')): Dataset {
  const n = Object.values(seriesValues)[0].length;
  const series: NormalizedSeries[] = Object.entries(seriesValues).map(([id, values]) => ({ id, name: id, unit: id.includes('share') ? '%' : 'MW', values }));
  return {
    key: 'publicPower',
    endpoint: '/v2/public_power',
    params: {},
    origin: 'snapshot',
    timezone: 'Europe/Berlin',
    resolution: 'PT15M',
    intervalMs: QUARTER,
    unit: 'MW',
    generatedAt: 0,
    fetchedAt: 0,
    availableFrom: start,
    availableUntil: start + (n - 1) * QUARTER,
    license: null,
    attributes: {},
    timestamps: Array.from({ length: n }, (_, i) => start + i * QUARTER),
    series,
  };
}

function installed(solarGw: number, onGw: number, offGw: number): Dataset {
  return {
    key: 'installedPower',
    endpoint: '/v2/installed_power',
    params: {},
    origin: 'snapshot',
    timezone: 'Europe/Berlin',
    resolution: 'P1M',
    intervalMs: null,
    unit: null,
    generatedAt: 0,
    fetchedAt: 0,
    availableFrom: 0,
    availableUntil: 0,
    license: null,
    attributes: {},
    timestamps: [startOfBerlinDay('2026-10-01')],
    series: [
      { id: 'solar_ac', name: 'Solar AC', unit: 'GW', values: [solarGw] },
      { id: 'wind_onshore', name: 'Wind onshore', unit: 'GW', values: [onGw] },
      { id: 'wind_offshore', name: 'Wind offshore', unit: 'GW', values: [offGw] },
    ],
  };
}

describe('generation status', () => {
  it('aggregates categories, keeps nulls as missing and uses the API share series', () => {
    const ds = pp({
      solar: [0, 1000, 2000],
      wind_onshore: [5000, 6000, 7000],
      wind_offshore: [1000, null, 1000],
      biomass: [4000, 4000, 4000],
      hydro_run_of_river: [1000, 1000, 1000],
      hydro_water_reservoir: [100, 100, null],
      fossil_brown_coal_lignite: [8000, 8000, 8000],
      fossil_hard_coal: [2000, 2000, 2000],
      fossil_gas: [3000, 3000, 3000],
      load: [40_000, 41_000, 42_000],
      renewable_share_of_load: [30, 31.5, 33],
    });
    const now = ds.timestamps[2] + 60_000;
    const s = getGenerationStatus(ds, now)!;
    expect(s.t).toBe(ds.timestamps[2]);
    expect(s.solarMw).toBe(2000);
    expect(s.windTotalMw).toBe(8000);
    expect(s.categories.hydro).toBe(1000); // reservoir null → only run-of-river counted
    expect(s.categories.other).toBeNull(); // no series → null, not 0
    expect(s.totalGenerationMw).toBe(2000 + 7000 + 1000 + 4000 + 1000 + 8000 + 2000 + 3000);
    expect(s.renewableShareOfLoad).toBe(33);
    expect(s.fossilShareOfGeneration).toBeCloseTo((13_000 / 28_000) * 100);
    expect(s.loadMw).toBe(42_000);
    expect(s.solarChange1hMw).toBeNull(); // not enough history for 1 h
  });

  it('picks the newest record with real wind/solar even if later records are null', () => {
    const ds = pp({ solar: [100, 200, null, null], wind_onshore: [1000, 1100, null, null], load: [1, 2, 3, 4] });
    const s = getGenerationStatus(ds, ds.timestamps[3] + 1)!;
    expect(s.t).toBe(ds.timestamps[1]);
    expect(s.solarMw).toBe(200);
  });

  it('computes rows and daily energy (MW × 0.25 h → GWh)', () => {
    const ds = pp({ solar: Array(96).fill(4000), wind_onshore: Array(96).fill(1000), load: Array(96).fill(50_000) });
    const rows = getGenerationRows(ds, '2026-10-15');
    expect(rows).toHaveLength(96);
    const energy = dailyEnergyGwh(rows, QUARTER);
    expect(energy.solar).toBeCloseTo(96); // 4000 MW × 24 h = 96 GWh
    expect(energy.windOnshore).toBeCloseTo(24);
    expect(getGenerationRows(ds, '2026-10-16')).toHaveLength(0);
    expect(getRecentGenerationRows(ds, 1)).toHaveLength(5); // 4 quarters + the newest
  });

  it('returns null without data', () => {
    expect(getGenerationStatus(undefined, 0)).toBeNull();
    expect(getGenerationStatus(pp({ solar: [] }), 0)).toBeNull();
  });
});

describe('installed capacity and mix rows', () => {
  it('reads installed capacity in GW from per-series units', () => {
    const cap = getInstalledCapacity(installed(118.6, 71.3, 11.4));
    expect(cap.solarGw).toBeCloseTo(118.6);
    expect(cap.windOnshoreGw).toBeCloseTo(71.3);
    expect(getInstalledCapacity(undefined).solarGw).toBeNull();
  });

  it('sorts sources by output, computes shares and utilisation, skips missing ones', () => {
    const ds = pp({ solar: [11_860], wind_onshore: [7130], wind_offshore: [0], fossil_gas: [1000], load: [30_000] });
    const status = getGenerationStatus(ds, ds.timestamps[0] + 1);
    const rows = getMixRows(status, getInstalledCapacity(installed(118.6, 71.3, 11.4)));
    expect(rows.map((r) => r.id)).toEqual(['solar', 'windOnshore', 'gas', 'windOffshore']);
    expect(rows[0].sharePct).toBeCloseTo((11_860 / 19_990) * 100);
    expect(rows[0].utilisation).toBeCloseTo(0.1);
    expect(rows[1].utilisation).toBeCloseTo(0.1);
    expect(rows[2].utilisation).toBeNull();
    expect(rows.find((r) => r.id === 'lignite')).toBeUndefined(); // no series → not shown
    expect(getMixRows(null, getInstalledCapacity(undefined))).toEqual([]);
  });
});
