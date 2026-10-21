/**
 * Panik-Index – a satirical, self-defined score (0–100). NOT an official
 * grid indicator. It blends three real measurements, each mapped to 0–100:
 *
 *  - Frequenz:  |f − 50 Hz| → 0 at 0 mHz, 100 at ≥ 150 mHz
 *  - Preis:     day-ahead price → 0 at ≤ 50 €/MWh, 100 at ≥ 300 €/MWh
 *  - Flaute:    100 − renewable share of load (%)
 *
 * Missing inputs are skipped and the remaining weights re-normalised.
 * Large frequency deviations (rare!) override the blend upwards.
 */
import { clamp } from '@/lib/formatters';

export type Mood = 'zen' | 'chill' | 'nervous' | 'sweaty' | 'panic';
export type FactorId = 'frequency' | 'price' | 'flaute';

export interface PanicInput {
  /** f − 50 Hz in mHz. */
  deviationMilliHz: number | null;
  priceEurMwh: number | null;
  /** Renewable share of load in %. */
  renewableSharePct: number | null;
}

export interface PanicFactor {
  id: FactorId;
  /** 0–100 */
  score: number;
  weight: number;
}

export interface PanicResult {
  score: number;
  mood: Mood;
  factors: PanicFactor[];
}

export const PANIC_WEIGHTS: Record<FactorId, number> = { frequency: 0.4, price: 0.3, flaute: 0.3 };

export function frequencyScore(deviationMilliHz: number): number {
  return clamp((Math.abs(deviationMilliHz) / 150) * 100, 0, 100);
}

export function priceScore(eurMwh: number): number {
  return clamp(((eurMwh - 50) / 250) * 100, 0, 100);
}

export function flauteScore(renewableSharePct: number): number {
  return clamp(100 - renewableSharePct, 0, 100);
}

export function moodFor(score: number): Mood {
  if (score < 20) return 'zen';
  if (score < 40) return 'chill';
  if (score < 60) return 'nervous';
  if (score < 80) return 'sweaty';
  return 'panic';
}

const finite = (v: number | null): v is number => v !== null && Number.isFinite(v);

export function computePanic(input: PanicInput): PanicResult | null {
  const factors: PanicFactor[] = [];
  if (finite(input.deviationMilliHz)) factors.push({ id: 'frequency', score: frequencyScore(input.deviationMilliHz), weight: PANIC_WEIGHTS.frequency });
  if (finite(input.priceEurMwh)) factors.push({ id: 'price', score: priceScore(input.priceEurMwh), weight: PANIC_WEIGHTS.price });
  if (finite(input.renewableSharePct)) factors.push({ id: 'flaute', score: flauteScore(input.renewableSharePct), weight: PANIC_WEIGHTS.flaute });
  if (factors.length === 0) return null;
  const weightSum = factors.reduce((s, f) => s + f.weight, 0);
  let score = factors.reduce((s, f) => s + f.score * f.weight, 0) / weightSum;
  if (finite(input.deviationMilliHz)) {
    const dev = Math.abs(input.deviationMilliHz);
    if (dev >= 150) score = Math.max(score, 85);
    else if (dev >= 100) score = Math.max(score, 65);
  }
  score = Math.round(clamp(score, 0, 100));
  return { score, mood: moodFor(score), factors: factors.map((f) => ({ ...f, weight: f.weight / weightSum })) };
}

/** Mood of the frequency alone (for the EKG card). */
export function frequencyMood(deviationMilliHz: number): Mood {
  const d = Math.abs(deviationMilliHz);
  if (d < 20) return 'zen';
  if (d < 50) return 'chill';
  if (d < 100) return 'nervous';
  if (d < 150) return 'sweaty';
  return 'panic';
}

/**
 * "Weltuntergangsuhr" – satire in the style of the Doomsday Clock: the higher
 * the index, the closer to midnight. 0 → 23:00, 100 → 23:59.
 */
export function minutesToMidnight(score: number): number {
  return Math.max(1, Math.round(60 * (1 - clamp(score, 0, 100) / 100)));
}

export function doomClockTime(score: number): string {
  return `23:${String(60 - minutesToMidnight(score)).padStart(2, '0')}`;
}
