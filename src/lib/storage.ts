/**
 * Safe localStorage wrapper. Storage can be unavailable (private mode, quota,
 * disabled) – every access is guarded and failures are silent.
 */

const PREFIX = '50hz:';

function store(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(PREFIX + key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    store()?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    store()?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function storageKeys(): string[] {
  try {
    const s = store();
    if (!s) return [];
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
    }
    return keys;
  } catch {
    return [];
  }
}
