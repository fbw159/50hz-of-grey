import { describe, expect, it } from 'vitest';
import { buildHeadline } from './headline';
import type { FrequencyStatus } from './frequency';
import type { GenerationStatus } from './mix';

function freq(value: number, stale = false): FrequencyStatus {
  return {
    value,
    t: 0,
    ageMs: 0,
    deviationHz: value - 50,
    deviationMilliHz: (value - 50) * 1000,
    region: 'DE-Freiburg',
    synchronousArea: 'RG Kontinentaleuropa',
    origin: 'snapshot',
    isPerfect: false,
    stale,
  };
}

function gen(share: number): GenerationStatus {
  return { t: Date.UTC(2026, 9, 24, 10), renewableShareOfLoad: share } as GenerationStatus;
}

describe('front-page headline', () => {
  it('dramatises a normal frequency, but tells the truth', () => {
    const h = buildHeadline({ frequency: freq(49.987), priceEurMwh: 90, generation: gen(50) }, '1')!;
    expect(h.topic).toBe('frequency');
    expect(h.text).toContain(h.highlight);
    expect(h.text).toMatch(/13 Millihertz|49,987 Hz/);
    expect(h.truth).toContain('völlig normal');
    expect(h.truth).toContain('±200 mHz');
  });

  it('uses the right direction for frequencies above 50 Hz', () => {
    for (const slot of ['1', '2', '3', '4', '5']) {
      const h = buildHeadline({ frequency: freq(50.021), priceEurMwh: null, generation: null }, slot)!;
      expect(h.text).not.toMatch(/sackt|weg|geklaut|fehlen/);
    }
  });

  it('calls a large deviation an alarm and explains the real thresholds', () => {
    const h = buildHeadline({ frequency: freq(49.75), priceEurMwh: null, generation: null }, '1')!;
    expect(h.kicker).toBe('Ausnahmezustand');
    expect(h.truth).toContain('49,0 Hz');
  });

  it('lets negative prices and extreme shares win the front page', () => {
    const neg = buildHeadline({ frequency: freq(50.004), priceEurMwh: -12, generation: gen(60) }, '1')!;
    expect(neg.topic).toBe('price');
    expect(neg.truth).toContain('−1,2 ct');
    // similarly dramatic topics take turns between time slots
    const topics = Array.from({ length: 30 }, (_, i) => buildHeadline({ frequency: freq(50.004), priceEurMwh: 90, generation: gen(18) }, String(i))!);
    const flaute = topics.find((h) => h.topic === 'share')!;
    expect(flaute).toBeDefined();
    expect(topics.some((h) => h.topic === 'frequency')).toBe(true);
    expect(flaute.truth).toMatch(/Stand \d{2}:\d{2} Uhr/);
  });

  it('ignores stale frequencies and returns null without data', () => {
    expect(buildHeadline({ frequency: freq(49.9, true), priceEurMwh: null, generation: null }, '1')).toBeNull();
    expect(buildHeadline({ frequency: null, priceEurMwh: 90, generation: gen(50) }, '1')).toBeNull();
  });
});
