import { describe, expect, it } from 'vitest';
import { computePanic, flauteScore, frequencyMood, frequencyScore, moodFor, priceScore } from './panic';

describe('Panik-Index', () => {
  it('maps each factor to 0–100', () => {
    expect(frequencyScore(0)).toBe(0);
    expect(frequencyScore(-75)).toBe(50);
    expect(frequencyScore(400)).toBe(100);
    expect(priceScore(50)).toBe(0);
    expect(priceScore(175)).toBe(50);
    expect(priceScore(-30)).toBe(0);
    expect(priceScore(900)).toBe(100);
    expect(flauteScore(60)).toBe(40);
    expect(flauteScore(120)).toBe(0);
  });

  it('blends the factors with fixed weights', () => {
    // 15 mHz → 10, 175 €/MWh → 50, 60 % → 40 ⇒ 0.4·10 + 0.3·50 + 0.3·40 = 31
    const r = computePanic({ deviationMilliHz: 15, priceEurMwh: 175, renewableSharePct: 60 })!;
    expect(r.score).toBe(31);
    expect(r.mood).toBe('chill');
    expect(r.factors.map((f) => f.id)).toEqual(['frequency', 'price', 'flaute']);
  });

  it('re-normalises weights when inputs are missing and returns null without any', () => {
    const r = computePanic({ deviationMilliHz: null, priceEurMwh: 300, renewableSharePct: null })!;
    expect(r.score).toBe(100);
    expect(r.factors).toHaveLength(1);
    expect(r.factors[0].weight).toBe(1);
    expect(computePanic({ deviationMilliHz: null, priceEurMwh: null, renewableSharePct: null })).toBeNull();
  });

  it('lets rare, large frequency deviations override a calm blend', () => {
    expect(computePanic({ deviationMilliHz: -160, priceEurMwh: 0, renewableSharePct: 100 })!.mood).toBe('panic');
    expect(computePanic({ deviationMilliHz: 110, priceEurMwh: 0, renewableSharePct: 100 })!.mood).toBe('sweaty');
  });

  it('has moods for every range', () => {
    expect([0, 25, 45, 70, 95].map(moodFor)).toEqual(['zen', 'chill', 'nervous', 'sweaty', 'panic']);
    expect([5, 30, 70, 120, 220].map(frequencyMood)).toEqual(['zen', 'chill', 'nervous', 'sweaty', 'panic']);
  });
});
