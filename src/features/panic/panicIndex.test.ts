import { describe, expect, it } from 'vitest';
import { computePanicIndex, panicCategory, type PanicInputs } from './panicIndex';

const tuesdayNoon = Date.UTC(2026, 9, 13, 10, 0); // 2026-10-13 12:00 Berlin (Tuesday)

const calm: PanicInputs = {
  priceEurPerMwh: 40,
  negativePriceNow: false,
  negativeIntervalsToday: 0,
  renewableShare: 55,
  frequencyDeviationMilliHz: 5,
  vreCapacityFactor: 0.3,
  bureaucracyIndex: 50,
  now: tuesdayNoon,
};

describe('Grid Panic Index™', () => {
  it('is deterministic and bounded', () => {
    const a = computePanicIndex(calm);
    const b = computePanicIndex(calm);
    expect(a.value).toBe(b.value);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThanOrEqual(100);
  });

  it('is low in calm conditions and rises with price, deviation and negative prices', () => {
    const base = computePanicIndex(calm).value;
    expect(base).toBeLessThan(30);
    const expensive = computePanicIndex({ ...calm, priceEurPerMwh: 250 }).value;
    expect(expensive).toBeGreaterThan(base);
    const negative = computePanicIndex({ ...calm, priceEurPerMwh: -10, negativePriceNow: true }).value;
    expect(negative).toBeGreaterThan(base);
    const shaky = computePanicIndex({ ...calm, frequencyDeviationMilliHz: -90 }).value;
    expect(shaky).toBeGreaterThan(base);
  });

  it('applies the bureaucracy multiplier', () => {
    const r = computePanicIndex({ ...calm, bureaucracyIndex: 97 });
    expect(r.multiplier).toBeCloseTo(1.1175, 4);
    expect(r.value).toBeGreaterThanOrEqual(computePanicIndex({ ...calm, bureaucracyIndex: 50 }).value);
  });

  it('handles missing data without crashing and says so', () => {
    const r = computePanicIndex({ ...calm, priceEurPerMwh: null, renewableShare: null, frequencyDeviationMilliHz: null, vreCapacityFactor: null });
    expect(r.components.find((c) => c.id === 'price')?.satire).toBe(true);
    expect(r.value).toBeGreaterThanOrEqual(0);
  });

  it('clamps to 100 under maximal nonsense', () => {
    const r = computePanicIndex({ ...calm, priceEurPerMwh: 900, negativePriceNow: true, renewableShare: 5, frequencyDeviationMilliHz: 500, vreCapacityFactor: 0.01, bureaucracyIndex: 100, now: Date.UTC(2026, 9, 12, 16, 30) });
    expect(r.value).toBe(100);
    expect(r.category.min).toBe(96);
  });

  it('maps values to categories', () => {
    expect(panicCategory(0).label).toMatch(/ruhig/);
    expect(panicCategory(20).min).toBe(0);
    expect(panicCategory(21).min).toBe(21);
    expect(panicCategory(74).label).toMatch(/Redispatch/);
    expect(panicCategory(100).label).toMatch(/Management/);
  });
});
