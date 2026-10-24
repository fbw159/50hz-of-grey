import { describe, expect, it } from 'vitest';
import { buildHeadline } from './headline';
import { MINUS } from '@/lib/formatters';
import type { FrequencyStatus } from './frequency';
import type { GenerationStatus } from './mix';

function freq(value: number, stale = false): FrequencyStatus {
  return {
    value,
    t: 0,
    ageMs: 0,
    deviationHz: value - 50,
    deviationMilliHz: (value - 50) * 1000,
    roundedMilliHz: Math.round(value * 1000) - 50_000,
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

describe('headline numbers and truths', () => {
  it('shows the same mHz as the three-decimal Hz value', () => {
    // a value right on the rounding edge: Hz and mHz must come from the same rounding
    const f = freq(49.9805);
    const hz = ((50_000 + f.roundedMilliHz) / 1000).toFixed(3).replace('.', ',');
    for (let slot = 0; slot < 20; slot++) {
      const h = buildHeadline({ frequency: f, priceEurMwh: 90, generation: null }, String(slot))!;
      expect(h.truth).toContain(`${hz} Hz`);
      if (h.text.includes('Millihertz')) expect(h.text).toContain(`${Math.abs(f.roundedMilliHz)} Millihertz`);
      else expect(h.text).toContain(hz);
    }
  });

  it('explains very high frequencies with the solar cut-back, low ones with load shedding', () => {
    const high = buildHeadline({ frequency: freq(50.21), priceEurMwh: null, generation: null }, '1')!;
    expect(high.truth).toMatch(/50,2 Hz/);
    expect(high.truth).not.toMatch(/49,0/);
    const low = buildHeadline({ frequency: freq(49.79), priceEurMwh: null, generation: null }, '1')!;
    expect(low.truth).toMatch(/49,0 Hz/);
  });

  it('words a renewable share above 100 % correctly', () => {
    const h = buildHeadline({ frequency: null, priceEurMwh: 60, generation: gen(112) }, '1')!;
    expect(h.truth).toMatch(/mehr Strom, als Deutschland verbraucht/);
  });

  it('never shows a tiny negative price as zero', () => {
    const h = buildHeadline({ frequency: null, priceEurMwh: -0.01, generation: null }, '1')!;
    expect(h.truth).toContain(`${MINUS}0,001 ct`);
  });
});

