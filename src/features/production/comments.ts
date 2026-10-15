/**
 * Data-driven generation comments. Thresholds are explicit; the texts are
 * satire, the trigger conditions are real.
 */
import type { HumorIntensity, HumorMessage } from '@/data/jokes';
import { isNight, pickMessage, rotationSlot } from '@/lib/humorEngine';
import type { GenerationStatus } from './productionMetrics';

export const PV_HIGH_MW = 15_000;
export const PV_LOW_MW = 3_000;
export const WIND_HIGH_MW = 25_000;
export const WIND_LOW_MW = 5_000;
export const EE_HIGH_SHARE = 65;
export const FOSSIL_HIGH_SHARE = 50;

export interface GenerationComment {
  id: string;
  message: HumorMessage;
  /** Which condition fired (for tests / explanation). */
  reason: string;
}

export function generationComments(gen: GenerationStatus | null, now: number, intensity: HumorIntensity): GenerationComment[] {
  if (!gen) return [];
  const slot = rotationSlot(now, 10);
  const out: GenerationComment[] = [];
  const add = (category: Parameters<typeof pickMessage>[0], reason: string) => {
    const message = pickMessage(category, { seed: `gen-${reason}-${slot}`, intensity: intensity === 'professional' ? 'engineer' : intensity });
    if (message) out.push({ id: `${reason}-${message.id}`, message, reason });
  };

  if (gen.solarMw !== null) {
    if (isNight(gen.t) && gen.solarMw <= 50) add('solarNight', 'pv-night');
    else if (gen.solarMw >= PV_HIGH_MW) add('solarDay', 'pv-high');
    else if (!isNight(gen.t) && gen.solarMw < PV_LOW_MW) add('solarLow', 'pv-low');
  }
  if (gen.windTotalMw !== null) {
    if (gen.windTotalMw >= WIND_HIGH_MW) add('windHigh', 'wind-high');
    else if (gen.windTotalMw < WIND_LOW_MW) add('windLow', 'wind-low');
  }
  if (gen.renewableShareOfLoad !== null && gen.renewableShareOfLoad >= EE_HIGH_SHARE) add('eeHigh', 'ee-high');
  if (gen.fossilShareOfGeneration !== null && gen.fossilShareOfGeneration >= FOSSIL_HIGH_SHARE) add('fossilHigh', 'fossil-high');
  return out;
}
