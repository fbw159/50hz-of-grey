/**
 * Static data snapshot format (public/data/latest.json).
 *
 * Written by scripts/update-data.mjs (Node, GitHub Actions) and read by the
 * browser as a fallback when direct API access is not possible (which is the
 * normal case on GitHub Pages because the API does not allow cross-origin
 * requests). Keep this in sync with the script.
 */
import type { DatasetKey } from './data';

export interface SnapshotSeries {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
}

export type SnapshotTime =
  | { start: number; stepMs: number; count: number } // regular grid (compact)
  | { timestamps: number[] }; // irregular

export interface SnapshotDataset {
  status: 'ok' | 'error' | 'empty';
  endpoint: string;
  params: Record<string, string>;
  fetchedAt: string; // ISO
  error?: { status?: number; message: string } | null;
  timezone?: string;
  resolution?: string | null;
  intervalMinutes?: number | null;
  unit?: string | null;
  generatedAt?: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  license?: string | null;
  attributes?: Record<string, unknown>;
  series?: SnapshotSeries[];
  time?: SnapshotTime;
  values?: Record<string, (number | null)[]>;
}

export interface SnapshotFile {
  schemaVersion: 1;
  generator: string;
  fetchedAt: string; // ISO – when the snapshot job ran
  source: { name: string; url: string; license: string };
  datasets: Partial<Record<DatasetKey, SnapshotDataset>>;
  errors: { key: string; message: string; status?: number }[];
}
