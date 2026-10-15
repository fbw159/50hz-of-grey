/**
 * Loads the static snapshot written by scripts/update-data.mjs.
 * The snapshot lives next to the app (public/data/latest.json) and is
 * referenced relative to import.meta.env.BASE_URL so it works under the
 * GitHub-Pages sub path.
 */
import type { DatasetMap, DatasetKey } from '@/types/data';
import { DATASET_KEYS } from '@/types/data';
import type { SnapshotFile } from '@/types/snapshot';
import { datasetFromSnapshot } from './dataAdapters';
import { parseIso } from '@/lib/dateUtils';

export interface SnapshotResult {
  datasets: DatasetMap;
  fetchedAt: number;
  errors: { key: string; message: string; status?: number }[];
  source: SnapshotFile['source'];
}

export function snapshotUrl(baseUrl: string = import.meta.env.BASE_URL, now = Date.now()): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  // cache-buster rounded to the minute: avoids stale CDN copies without defeating caching entirely
  return `${base}data/latest.json?t=${Math.floor(now / 60_000)}`;
}

export function decodeSnapshot(raw: unknown): SnapshotResult {
  if (!raw || typeof raw !== 'object') throw new Error('Snapshot: kein Objekt');
  const file = raw as SnapshotFile;
  if (file.schemaVersion !== 1 || !file.datasets) throw new Error('Snapshot: unbekanntes Format');
  const datasets: DatasetMap = {};
  for (const key of DATASET_KEYS) {
    const snap = file.datasets[key as DatasetKey];
    if (!snap) continue;
    try {
      const ds = datasetFromSnapshot(key, snap);
      if (ds) datasets[key] = ds;
    } catch {
      /* skip broken dataset, keep the rest */
    }
  }
  return {
    datasets,
    fetchedAt: parseIso(file.fetchedAt) ?? 0,
    errors: Array.isArray(file.errors) ? file.errors : [],
    source: file.source,
  };
}

export async function loadSnapshot(fetchImpl: typeof fetch = (i, init) => fetch(i, init), now = Date.now()): Promise<SnapshotResult> {
  const response = await fetchImpl(snapshotUrl(import.meta.env.BASE_URL, now), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Snapshot nicht erreichbar (HTTP ${response.status})`);
  const raw = (await response.json()) as unknown;
  return decodeSnapshot(raw);
}
