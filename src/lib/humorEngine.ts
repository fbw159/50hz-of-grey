/**
 * Humour engine: picks messages from the catalogue deterministically.
 *
 * Determinism matters: a message is selected from (category, seed) – the seed
 * normally contains a time "slot" (e.g. 10-minute bucket), so the same text
 * stays on screen for a while and never re-rolls on every render.
 */
import { HUMOR_CATALOG, type HumorCategory, type HumorIntensity, type HumorMessage, ENGINEER_FACTS, NONSENSE_KPIS } from '@/data/jokes';
import { hashString, seededRandom } from '@/lib/timeseries';
import { berlinDayKey, zonedParts, MINUTE } from '@/lib/dateUtils';

const INTENSITY_RANK: Record<HumorIntensity, number> = { professional: 0, engineer: 1, unhinged: 2 };

export function intensityAllows(message: HumorMessage, intensity: HumorIntensity): boolean {
  const min = message.minIntensity ?? 'engineer';
  return INTENSITY_RANK[intensity] >= INTENSITY_RANK[min];
}

const byCategory = new Map<HumorCategory, HumorMessage[]>();
for (const msg of HUMOR_CATALOG) {
  const list = byCategory.get(msg.category) ?? [];
  list.push(msg);
  byCategory.set(msg.category, list);
}

export function messagesFor(category: HumorCategory, intensity: HumorIntensity = 'unhinged'): HumorMessage[] {
  return (byCategory.get(category) ?? []).filter((m) => intensityAllows(m, intensity));
}

/** Time slot that changes every `minutes` – used as part of the seed. */
export function rotationSlot(now: number, minutes = 10): number {
  return Math.floor(now / (minutes * MINUTE));
}

export interface PickOptions {
  seed: string;
  intensity?: HumorIntensity;
  /** Message ids to avoid (e.g. the previous one). */
  exclude?: string[];
}

/** Deterministically pick one message of a category (null if none allowed). */
export function pickMessage(category: HumorCategory, opts: PickOptions): HumorMessage | null {
  let pool = messagesFor(category, opts.intensity ?? 'engineer');
  if (opts.exclude?.length) {
    const filtered = pool.filter((m) => !opts.exclude!.includes(m.id));
    if (filtered.length) pool = filtered;
  }
  if (pool.length === 0) return null;
  const idx = hashString(`${category}|${opts.seed}`) % pool.length;
  return pool[idx];
}

/**
 * Caption for a KPI: in "professional" mode the neutral category is used,
 * otherwise the satirical one (falls back to neutral if nothing allowed).
 */
export function pickCaption(satireCategory: HumorCategory, neutralCategory: HumorCategory, opts: PickOptions): HumorMessage | null {
  const intensity = opts.intensity ?? 'engineer';
  if (intensity === 'professional') return pickMessage(neutralCategory, { ...opts, intensity }) ?? pickMessage(satireCategory, { ...opts, intensity });
  return pickMessage(satireCategory, { ...opts, intensity }) ?? pickMessage(neutralCategory, { ...opts, intensity });
}

/** Pick `count` distinct messages (deterministic order) – for tickers. */
export function pickMany(category: HumorCategory, count: number, opts: PickOptions): HumorMessage[] {
  const pool = messagesFor(category, opts.intensity ?? 'engineer');
  if (pool.length === 0) return [];
  const rnd = seededRandom(`${category}|${opts.seed}`);
  const shuffled = [...pool].sort(() => rnd() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** A fresh random message (interaction-triggered buttons) – avoids the previous id. */
export function randomMessage(category: HumorCategory, previousId?: string): HumorMessage | null {
  const pool = messagesFor(category, 'unhinged').filter((m) => m.id !== previousId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function engineerFactOfTheMoment(now: number): { title: string; text: string } {
  const slot = rotationSlot(now, 30);
  return ENGINEER_FACTS[hashString(`fact-${slot}`) % ENGINEER_FACTS.length];
}

export interface NonsenseKpi {
  label: string;
  value: number;
  unit: string;
  note: string;
}

/** The "Quatsch-KPI des Tages" – deterministic per Berlin day. */
export function nonsenseKpiOfTheDay(now: number): NonsenseKpi {
  const dayKey = berlinDayKey(now);
  const h = hashString(`quatsch-${dayKey}`);
  const def = NONSENSE_KPIS[h % NONSENSE_KPIS.length];
  const rnd = seededRandom(`quatsch-value-${dayKey}`);
  const value = def.min + Math.floor(rnd() * (def.max - def.min + 1));
  return { label: def.label, value, unit: def.unit, note: def.note };
}

/** Night in Berlin (for PV captions): 20:00–06:00 local time. */
export function isNight(now: number): boolean {
  const { hour } = zonedParts(now);
  return hour >= 20 || hour < 6;
}
