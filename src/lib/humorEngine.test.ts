import { describe, expect, it } from 'vitest';
import { intensityAllows, messagesFor, nonsenseKpiOfTheDay, pickCaption, pickMany, pickMessage, rotationSlot } from './humorEngine';
import { HUMOR_CATALOG } from '@/data/jokes';

describe('humour engine', () => {
  it('has unique ids and sane fields', () => {
    const ids = new Set(HUMOR_CATALOG.map((m) => m.id));
    expect(ids.size).toBe(HUMOR_CATALOG.length);
    for (const m of HUMOR_CATALOG) expect(m.title.length).toBeGreaterThan(3);
  });

  it('picks deterministically for a given seed and rotates with the slot', () => {
    const a = pickMessage('frequency', { seed: 'slot-1', intensity: 'engineer' });
    const b = pickMessage('frequency', { seed: 'slot-1', intensity: 'engineer' });
    expect(a?.id).toBe(b?.id);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(pickMessage('frequency', { seed: `slot-${i}`, intensity: 'engineer' })!.id);
    expect(seen.size).toBeGreaterThan(3);
  });

  it('respects the intensity levels', () => {
    const unhingedOnly = HUMOR_CATALOG.filter((m) => m.minIntensity === 'unhinged');
    expect(unhingedOnly.length).toBeGreaterThan(0);
    for (const m of unhingedOnly) {
      expect(intensityAllows(m, 'engineer')).toBe(false);
      expect(intensityAllows(m, 'unhinged')).toBe(true);
    }
    expect(messagesFor('frequency', 'professional')).toHaveLength(0);
    expect(messagesFor('frequencyNeutral', 'professional').length).toBeGreaterThan(0);
  });

  it('uses neutral captions in professional mode', () => {
    const neutral = pickCaption('frequency', 'frequencyNeutral', { seed: 'x', intensity: 'professional' });
    expect(neutral?.isSatire).toBe(false);
    const satire = pickCaption('frequency', 'frequencyNeutral', { seed: 'x', intensity: 'engineer' });
    expect(satire?.isSatire).toBe(true);
  });

  it('pickMany returns distinct messages', () => {
    const list = pickMany('gridOps', 5, { seed: 'abc', intensity: 'unhinged' });
    expect(new Set(list.map((m) => m.id)).size).toBe(list.length);
    expect(list.length).toBe(5);
  });

  it('rotation slots and nonsense KPI are stable within their period', () => {
    expect(rotationSlot(10 * 60_000 + 1, 10)).toBe(1);
    expect(rotationSlot(10 * 60_000 - 1, 10)).toBe(0);
    const d1 = nonsenseKpiOfTheDay(Date.UTC(2026, 9, 15, 8));
    const d2 = nonsenseKpiOfTheDay(Date.UTC(2026, 9, 15, 20));
    expect(d1).toEqual(d2);
  });
});
