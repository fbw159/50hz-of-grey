/**
 * Achievements – stored locally, no accounts. Unlock notifications are
 * delivered through a listener so the UI can show a non-intrusive toast.
 */
import { useSyncExternalStore } from 'react';
import { ACHIEVEMENTS, type AchievementDef, type AchievementEvent } from '@/data/achievements';
import { readJson, writeJson } from '@/lib/storage';

export interface AchievementState {
  unlocked: Record<string, number>; // id → epoch ms
  counters: Partial<Record<AchievementEvent, number>>;
}

const STORAGE_KEY = 'achievements-v1';
type Listener = () => void;
type UnlockListener = (def: AchievementDef) => void;

function sanitize(raw: unknown): AchievementState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AchievementState>;
  const unlocked: Record<string, number> = {};
  if (r.unlocked && typeof r.unlocked === 'object') {
    for (const [k, v] of Object.entries(r.unlocked)) if (typeof v === 'number') unlocked[k] = v;
  }
  const counters: Partial<Record<AchievementEvent, number>> = {};
  if (r.counters && typeof r.counters === 'object') {
    for (const [k, v] of Object.entries(r.counters)) if (typeof v === 'number') counters[k as AchievementEvent] = v;
  }
  return { unlocked, counters };
}

class AchievementStore {
  private state: AchievementState;
  private listeners = new Set<Listener>();
  private unlockListeners = new Set<UnlockListener>();
  constructor() {
    this.state = sanitize(readJson<unknown>(STORAGE_KEY, null));
  }
  getState = (): AchievementState => this.state;
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  onUnlock(l: UnlockListener): () => void {
    this.unlockListeners.add(l);
    return () => this.unlockListeners.delete(l);
  }
  private commit(next: AchievementState) {
    this.state = next;
    writeJson(STORAGE_KEY, next);
    for (const l of this.listeners) l();
  }
  /** Record an event; returns the achievements unlocked by it. */
  track(event: AchievementEvent, amount = 1, now = Date.now()): AchievementDef[] {
    const counters = { ...this.state.counters, [event]: (this.state.counters[event] ?? 0) + amount };
    const unlocked = { ...this.state.unlocked };
    const newly: AchievementDef[] = [];
    for (const def of ACHIEVEMENTS) {
      if (def.event !== event || unlocked[def.id]) continue;
      if ((counters[event] ?? 0) >= def.threshold) {
        unlocked[def.id] = now;
        newly.push(def);
      }
    }
    this.commit({ counters, unlocked });
    for (const def of newly) for (const l of this.unlockListeners) l(def);
    return newly;
  }
  /** Set a counter to at least `value` (e.g. meeting participants). */
  trackMax(event: AchievementEvent, value: number, now = Date.now()): AchievementDef[] {
    const current = this.state.counters[event] ?? 0;
    if (value <= current) return [];
    return this.track(event, value - current, now);
  }
  reset(): void {
    this.commit({ unlocked: {}, counters: {} });
  }
}

export const achievementStore = new AchievementStore();

export function useAchievements(): AchievementState {
  return useSyncExternalStore(achievementStore.subscribe, achievementStore.getState, achievementStore.getState);
}

export function achievementProgress(state: AchievementState, def: AchievementDef): { value: number; threshold: number; unlockedAt: number | null } {
  return { value: Math.min(def.threshold, state.counters[def.event] ?? 0), threshold: def.threshold, unlockedAt: state.unlocked[def.id] ?? null };
}
