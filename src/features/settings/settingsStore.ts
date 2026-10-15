/**
 * User settings – persisted in localStorage, no accounts, no tracking.
 */
import { useSyncExternalStore } from 'react';
import type { HumorIntensity } from '@/data/jokes';
import { readJson, writeJson } from '@/lib/storage';

export type Theme = 'dark' | 'light';
export type MotionPreference = 'system' | 'reduce' | 'full';

export interface Settings {
  theme: Theme;
  retroScada: boolean;
  managementMode: boolean;
  animations: boolean;
  motion: MotionPreference;
  sounds: boolean;
  humor: HumorIntensity;
  demoMode: boolean;
  introSeen: boolean;
  /** Decorative "green charts" toggle of the management mode. */
  moreGreen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  retroScada: false,
  managementMode: false,
  animations: true,
  motion: 'system',
  sounds: false,
  humor: 'engineer',
  demoMode: false,
  introSeen: false,
  moreGreen: false,
};

const STORAGE_KEY = 'settings-v1';
type Listener = () => void;

function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const humor: HumorIntensity = r.humor === 'professional' || r.humor === 'engineer' || r.humor === 'unhinged' ? r.humor : DEFAULT_SETTINGS.humor;
  const motion: MotionPreference = r.motion === 'system' || r.motion === 'reduce' || r.motion === 'full' ? r.motion : 'system';
  return {
    theme: r.theme === 'light' ? 'light' : 'dark',
    retroScada: bool(r.retroScada, false),
    managementMode: bool(r.managementMode, false),
    animations: bool(r.animations, true),
    motion,
    sounds: bool(r.sounds, false),
    humor,
    demoMode: bool(r.demoMode, false),
    introSeen: bool(r.introSeen, false),
    moreGreen: bool(r.moreGreen, false),
  };
}

class SettingsStore {
  private state: Settings;
  private listeners = new Set<Listener>();
  constructor() {
    this.state = sanitize(readJson<unknown>(STORAGE_KEY, null));
  }
  getState = (): Settings => this.state;
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  update(patch: Partial<Settings>): void {
    this.state = { ...this.state, ...patch };
    writeJson(STORAGE_KEY, this.state);
    for (const l of this.listeners) l();
  }
  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.update({ [key]: value } as Partial<Settings>);
  }
  toggle(key: { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings]): void {
    this.set(key, !this.state[key]);
  }
  reset(): void {
    this.update({ ...DEFAULT_SETTINGS, introSeen: true });
  }
}

export const settingsStore = new SettingsStore();

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.getState, settingsStore.getState);
}

/** Effective reduced-motion flag: user override or system preference. */
export function prefersReducedMotion(settings: Settings): boolean {
  if (settings.motion === 'reduce') return true;
  if (settings.motion === 'full') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Animations are shown when enabled and motion is not reduced. */
export function animationsEnabled(settings: Settings): boolean {
  return settings.animations && !prefersReducedMotion(settings);
}
