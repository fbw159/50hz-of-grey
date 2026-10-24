import { describe, expect, it } from 'vitest';
import type { Dataset, DatasetKey } from '@/types/data';
import { buildWeather, blockLabel, weatherKind } from './weather';
import { startOfBerlinDay } from '@/lib/dateUtils';

const Q = 15 * 60_000;

function ds(key: DatasetKey, id: string, start: number, values: number[]): Dataset {
  return {
    key,
    endpoint: '/x',
    params: {},
    origin: 'snapshot',
    timezone: 'Europe/Berlin',
    resolution: 'PT15M',
    intervalMs: Q,
    unit: 'MW',
    generatedAt: 0,
    fetchedAt: 0,
    availableFrom: start,
    availableUntil: start + (values.length - 1) * Q,
    license: null,
    attributes: {},
    timestamps: values.map((_, i) => start + i * Q),
    series: [{ id, name: id, unit: 'MW', values }],
  };
}

describe('Netz-Wetter', () => {
  it('classifies the weather', () => {
    expect(weatherKind(40, 0)).toBe('storm');
    expect(weatherKind(10, 30)).toBe('sunny');
    expect(weatherKind(22, 2)).toBe('windy');
    expect(weatherKind(10, 12)).toBe('cloudy');
    expect(weatherKind(4, 3)).toBe('flaute');
    expect(weatherKind(12, 0.1)).toBe('night');
    expect(weatherKind(12, 4)).toBe('mixed');
    expect(weatherKind(null, null)).toBe('unknown');
  });

  it('groups forecasts into six-hour blocks from now on and averages them', () => {
    const day = '2026-10-21';
    const start = startOfBerlinDay(day);
    const n = 96 * 2;
    const datasets = {
      forecastSolar: ds('forecastSolar', 'solar', start, Array.from({ length: n }, (_, i) => ((i % 96) >= 48 && (i % 96) < 72 ? 30_000 : 0))),
      forecastWindOnshore: ds('forecastWindOnshore', 'wind_onshore', start, Array(n).fill(9000)),
      forecastWindOffshore: ds('forecastWindOffshore', 'wind_offshore', start, Array(n).fill(1000)),
      price: ds('price', 'day_ahead_price', start, Array.from({ length: 96 }, (_, i) => (i < 72 ? 100 : 200))),
    };
    const now = start + 13 * 3_600_000; // 13:00
    const blocks = buildWeather(datasets, now);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].part).toBe(2); // 12–18 Uhr
    expect(blocks[0].start).toBe(now); // only the remaining quarters
    expect(blocks[0].solarGw).toBeCloseTo(30);
    expect(blocks[0].windGw).toBeCloseTo(10);
    expect(blocks[0].kind).toBe('sunny');
    expect(blocks[0].priceCt).toBeCloseTo(10);
    expect(blocks[1].part).toBe(3);
    expect(blocks[1].priceCt).toBeCloseTo(20);
    expect(blocks[1].kind).toBe('night');
    expect(blocks[2].dayKey).toBe('2026-10-22');
    expect(blocks[2].priceCt).toBeNull(); // tomorrow's prices not published yet
    expect(blockLabel(blocks[0], now)).toEqual({ title: 'Heute Nachmittag', hours: '12–18 Uhr' });
    expect(blockLabel(blocks[2], now).title).toBe('Morgen früh');
  });

  it('returns nothing without data', () => {
    expect(buildWeather({}, Date.now())).toEqual([]);
  });
});

describe('Netz-Wetter without tomorrow forecasts', () => {
  it('marks blocks that only have prices as unknown weather', () => {
    const start = startOfBerlinDay('2026-10-24');
    const today = Array(96).fill(5000);
    const datasets = {
      forecastSolar: ds('forecastSolar', 'solar', start, Array(96).fill(0)),
      forecastWindOnshore: ds('forecastWindOnshore', 'wind_onshore', start, today),
      price: ds('price', 'day_ahead_price', start, Array(192).fill(80)),
    };
    const now = start + 22.5 * 3_600_000;
    const blocks = buildWeather(datasets, now);
    expect(blocks[0].kind).toBe('flaute'); // 5 GW wind, no sun
    expect(blocks.slice(1).every((b) => b.kind === 'unknown' && b.priceCt === 8)).toBe(true);
    expect(blocks).toHaveLength(4);
  });
});

describe('Netz-Wetter with half the wind forecast', () => {
  it('does not add up onshore and offshore when one of them is missing', () => {
    const start = startOfBerlinDay('2026-10-21');
    const datasets = {
      forecastWindOnshore: ds('forecastWindOnshore', 'wind_onshore', start, Array(96).fill(20_000)),
      // offshore only for the first half of the day
      forecastWindOffshore: ds('forecastWindOffshore', 'wind_offshore', start, Array(48).fill(5_000)),
    };
    const blocks = buildWeather(datasets, start, 4);
    expect(blocks[0].windGw).toBeCloseTo(25);
    expect(blocks[1].windGw).toBeCloseTo(25);
    // the afternoon would otherwise show a fake lull of 20 GW; without a full forecast it is left out
    expect(blocks).toHaveLength(2);
  });

  it('uses onshore alone when the offshore forecast failed completely', () => {
    const start = startOfBerlinDay('2026-10-21');
    const blocks = buildWeather({ forecastWindOnshore: ds('forecastWindOnshore', 'wind_onshore', start, Array(96).fill(20_000)) }, start, 4);
    expect(blocks.every((b) => b.windGw !== null && Math.abs(b.windGw - 20) < 1e-9)).toBe(true);
  });
});

