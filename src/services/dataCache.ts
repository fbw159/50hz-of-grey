/**
 * Last-good dataset cache in localStorage. Lets the app show (clearly
 * labelled) stale data when offline or when every source fails.
 */
import type { Dataset, DatasetKey, DatasetMap } from '@/types/data';
import { DATASET_KEYS } from '@/types/data';
import { readJson, writeJson, removeKey } from '@/lib/storage';

const CACHE_KEY = 'datasets-v1';
/** Keep the persisted blob small enough for every browser (≈ 2 MB upper bound). */
const MAX_BYTES = 2_000_000;

interface PersistedCache {
  savedAt: number;
  datasets: Partial<Record<DatasetKey, Dataset>>;
}

export function loadCachedDatasets(): { datasets: DatasetMap; savedAt: number } | null {
  const persisted = readJson<PersistedCache | null>(CACHE_KEY, null);
  if (!persisted || typeof persisted !== 'object' || !persisted.datasets) return null;
  const datasets: DatasetMap = {};
  for (const key of DATASET_KEYS) {
    const ds = persisted.datasets[key];
    if (ds && Array.isArray(ds.timestamps) && Array.isArray(ds.series)) {
      datasets[key] = { ...ds, origin: 'cache' };
    }
  }
  return { datasets, savedAt: persisted.savedAt ?? 0 };
}

export function saveCachedDatasets(datasets: DatasetMap, now = Date.now()): boolean {
  const payload: PersistedCache = { savedAt: now, datasets: {} };
  for (const key of DATASET_KEYS) {
    const ds = datasets[key];
    if (ds && ds.origin !== 'demo') payload.datasets[key] = ds;
  }
  const json = JSON.stringify(payload);
  if (json.length > MAX_BYTES) {
    // Drop the biggest dataset (frequency) and try again.
    delete payload.datasets.frequency;
    if (JSON.stringify(payload).length > MAX_BYTES) return false;
  }
  return writeJson(CACHE_KEY, payload);
}

export function clearCachedDatasets(): void {
  removeKey(CACHE_KEY);
}
