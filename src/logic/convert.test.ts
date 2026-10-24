import { describe, expect, it } from 'vitest';
import { formatBig, powerEquivalents, precisionMeters, priceEquivalents } from './convert';

describe('Auf Deutsch – conversions', () => {
  it('turns a frequency deviation into a parking error on Hamburg–München', () => {
    // 13 mHz of 50 Hz = 0,026 % of 610 km = 158,6 m
    expect(precisionMeters(13)).toBeCloseTo(158.6, 1);
    expect(precisionMeters(-13)).toBeCloseTo(158.6, 1);
    expect(precisionMeters(0)).toBe(0);
    expect(precisionMeters(50)).toBeCloseTo(610, 6);
  });

  it('converts power into DeLoreans, horsepower, cyclists and kettles', () => {
    const eq = powerEquivalents(60_500); // 60,5 GW
    expect(eq.deloreans).toBeCloseTo(50, 6); // 60 500 / 1 210
    expect(eq.horsepower).toBeCloseTo(60.5e9 / 735.49875, 0);
    expect(eq.cyclists).toBeCloseTo(605e6, -3);
    expect(eq.cyclistsPerGerman).toBeCloseTo(605e6 / 83.6e6, 6);
    expect(eq.kettles).toBeCloseTo(30.25e6, -3);
    expect(powerEquivalents(-5).deloreans).toBe(0);
  });

  it('prices everyday things at the wholesale price', () => {
    const eq = priceEquivalents(150); // 15 ct/kWh
    expect(eq.washCt).toBeCloseTo(15);
    expect(eq.evEur).toBeCloseTo(7.5);
    expect(eq.fridgeEur).toBeCloseTo(22.5);
    expect(priceEquivalents(-20).washCt).toBeCloseTo(-2);
  });

  it('writes big numbers in words', () => {
    expect(formatBig(1_234_000_000)).toBe('1,2 Milliarden');
    expect(formatBig(82_258_000)).toBe('82 Millionen');
    expect(formatBig(4_560_000)).toBe('4,6 Millionen');
    expect(formatBig(4321)).toBe('4.321');
  });
});
