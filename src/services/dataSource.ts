/**
 * Data orchestration: decides where each dataset comes from and keeps it
 * fresh. Order of preference: live API (if reachable) → static snapshot
 * (GitHub Actions) → last-good cache (localStorage). Demo data is only used
 * when the user explicitly switches the demo mode on – never silently.
 */
import type { DataOrigin, Dataset, DatasetError, DatasetKey, DatasetMap } from '@/types/data';
import { DATASET_KEYS } from '@/types/data';
import { ApiError, EnergyChartsClient } from './energyChartsApi';
import { loadSnapshot } from './snapshotLoader';
import { loadCachedDatasets, saveCachedDatasets } from './dataCache';
import { buildDemoDatasets } from '@/data/demoData';
import { MINUTE } from '@/lib/dateUtils';

export type SourceMode = 'auto' | 'demo';

export interface DataState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  mode: SourceMode;
  datasets: DatasetMap;
  errors: DatasetError[];
  snapshotError: string | null;
  /** Last time any dataset changed. */
  lastUpdated: number | null;
  lastAttempt: number | null;
  snapshotFetchedAt: number | null;
  liveConfigured: boolean;
  offline: boolean;
  refreshing: boolean;
  /** Incremented on every state change – cheap "version" for memoisation. */
  version: number;
}

type Listener = () => void;

const SNAPSHOT_REFRESH_MS = 5 * MINUTE;
const LIVE_TICK_MS = 30_000;
const LIVE_ORDER: DatasetKey[] = ['price', 'publicPower', 'forecastSolar', 'forecastWindOnshore', 'forecastWindOffshore', 'installedPower', 'frequency'];

/** Resolve the base URL for direct API requests (undefined = not available). */
export function resolveLiveBaseUrl(env: ImportMetaEnv = import.meta.env): string | undefined {
  const configured = (env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configured) return configured;
  if (env.DEV) return '/api/energy-charts';
  return undefined;
}

function freshness(ds: Dataset): number {
  return (ds.availableUntil ?? 0) * 2 + ds.fetchedAt / 1e6; // availableUntil dominates, fetchedAt breaks ties
}

export function pickFresher(a: Dataset | undefined, b: Dataset | undefined): Dataset | undefined {
  if (!a) return b;
  if (!b) return a;
  return freshness(b) > freshness(a) ? b : a;
}

export class DataSourceStore {
  private state: DataState;
  private listeners = new Set<Listener>();
  private client: EnergyChartsClient | null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private liveTimer: ReturnType<typeof setInterval> | null = null;
  private live: DatasetMap = {};
  private snapshot: DatasetMap = {};
  private cache: DatasetMap = {};
  private started = false;
  private liveRunning = false;
  private snapshotAttempted = false;
  private readonly now: () => number;

  constructor(opts: { liveBaseUrl?: string; now?: () => number; fetchImpl?: typeof fetch; mode?: SourceMode } = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.client = opts.liveBaseUrl ? new EnergyChartsClient({ baseUrl: opts.liveBaseUrl, fetchImpl: opts.fetchImpl, clock: this.now }) : null;
    const cached = loadCachedDatasets();
    if (cached) this.cache = cached.datasets;
    this.state = {
      status: 'idle',
      mode: opts.mode ?? 'auto',
      datasets: {},
      errors: [],
      snapshotError: null,
      lastUpdated: null,
      lastAttempt: null,
      snapshotFetchedAt: null,
      liveConfigured: !!this.client,
      offline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
      refreshing: false,
      version: 0,
    };
    this.recompute();
  }

  getState = (): DataState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(patch: Partial<DataState>) {
    this.state = { ...this.state, ...patch, version: this.state.version + 1 };
    for (const l of this.listeners) l();
  }

  /** Start periodic refreshes (idempotent). */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.snapshotTimer = setInterval(() => {
      if (this.isVisible()) void this.refreshSnapshot();
    }, SNAPSHOT_REFRESH_MS);
    if (this.client) {
      this.liveTimer = setInterval(() => {
        if (this.isVisible()) void this.refreshLive();
      }, LIVE_TICK_MS);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  stop(): void {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    if (this.liveTimer) clearInterval(this.liveTimer);
    this.snapshotTimer = null;
    this.liveTimer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    this.started = false;
  }

  private isVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
  }

  private handleOnline = () => {
    this.emit({ offline: false });
    void this.refresh();
  };
  private handleOffline = () => this.emit({ offline: true });
  private handleVisibility = () => {
    if (!this.isVisible()) return;
    const last = this.state.lastAttempt ?? 0;
    if (this.now() - last > 2 * MINUTE) void this.refresh();
  };

  setMode(mode: SourceMode): void {
    if (mode === this.state.mode) return;
    this.emit({ mode });
    this.recompute();
    if (mode === 'auto') void this.refresh();
  }

  /** Full refresh: snapshot + live (if configured). */
  async refresh(): Promise<void> {
    if (this.state.mode === 'demo') {
      this.recompute();
      return;
    }
    this.emit({ refreshing: true, status: this.state.status === 'idle' ? 'loading' : this.state.status, lastAttempt: this.now() });
    await Promise.all([this.refreshSnapshot(), this.refreshLive()]);
    this.emit({ refreshing: false });
  }

  async refreshSnapshot(): Promise<void> {
    try {
      const result = await loadSnapshot(undefined, this.now());
      this.snapshot = result.datasets;
      const empty = Object.keys(result.datasets).length === 0;
      this.emit({ snapshotError: empty ? 'Snapshot enthält noch keine Datensätze (npm run update-data ausführen oder auf den GitHub-Actions-Lauf warten)' : null, snapshotFetchedAt: result.fetchedAt });
    } catch (err) {
      this.emit({ snapshotError: err instanceof Error ? err.message : String(err) });
    }
    this.snapshotAttempted = true;
    this.recompute();
  }

  async refreshLive(): Promise<void> {
    if (!this.client || this.liveRunning) return;
    this.liveRunning = true;
    try {
      await this.runLiveCycle(this.client);
    } finally {
      this.liveRunning = false;
    }
  }

  private async runLiveCycle(client: EnergyChartsClient): Promise<void> {
    for (const key of LIVE_ORDER) {
      try {
        const ds = await client.fetchDataset(key, this.now());
        if (this.live[key] !== ds) {
          this.live[key] = ds;
          this.clearError(key);
          this.recompute();
        }
      } catch (err) {
        this.pushError(key, err);
      }
    }
  }

  private pushError(key: DatasetKey, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof ApiError ? err.status : undefined;
    const expected = err instanceof ApiError ? err.expected : false;
    const errors = this.state.errors.filter((e) => e.key !== key);
    errors.push({ key, message, status, expected, at: this.now() });
    this.emit({ errors });
  }

  private clearError(key: DatasetKey) {
    if (!this.state.errors.some((e) => e.key === key)) return;
    this.emit({ errors: this.state.errors.filter((e) => e.key !== key) });
  }

  /** Merge sources into the published dataset map. */
  private recompute(): void {
    const now = this.now();
    let datasets: DatasetMap;
    if (this.state.mode === 'demo') {
      datasets = buildDemoDatasets(now);
    } else {
      datasets = {};
      for (const key of DATASET_KEYS) {
        const best = pickFresher(pickFresher(this.live[key], this.snapshot[key]), this.cache[key]);
        if (best) datasets[key] = best;
      }
    }
    const changed = DATASET_KEYS.some((k) => datasets[k] !== this.state.datasets[k]);
    const anyData = DATASET_KEYS.some((k) => !!datasets[k]);
    // Without data: "error" once every configured source has had its chance
    // (live requests failed, or – without a live client – the snapshot attempt is over).
    const liveFailed = this.state.errors.some((e) => !e.expected);
    const snapshotDone = this.snapshotAttempted;
    const exhausted = this.client ? liveFailed && snapshotDone : snapshotDone;
    const status: DataState['status'] = anyData ? 'ready' : exhausted ? 'error' : this.state.status === 'idle' && !this.state.refreshing ? 'idle' : 'loading';
    this.emit({ datasets, status, lastUpdated: changed ? now : this.state.lastUpdated });
    if (changed && this.state.mode !== 'demo' && anyData) {
      saveCachedDatasets(datasets, now);
      this.cache = { ...this.cache, ...datasets };
    }
  }
}

/** Summarise where the currently displayed data comes from. */
export function summarizeOrigins(datasets: DatasetMap): { primary: DataOrigin | 'none'; counts: Record<DataOrigin, number> } {
  const counts: Record<DataOrigin, number> = { live: 0, snapshot: 0, cache: 0, demo: 0 };
  for (const key of DATASET_KEYS) {
    const ds = datasets[key];
    if (ds) counts[ds.origin]++;
  }
  const order: DataOrigin[] = ['demo', 'live', 'snapshot', 'cache'];
  let primary: DataOrigin | 'none' = 'none';
  let max = 0;
  for (const o of order) {
    if (counts[o] > max) {
      max = counts[o];
      primary = o;
    }
  }
  if (counts.demo > 0) primary = 'demo';
  return { primary, counts };
}

let singleton: DataSourceStore | null = null;
export function getDataSourceStore(): DataSourceStore {
  if (!singleton) singleton = new DataSourceStore({ liveBaseUrl: resolveLiveBaseUrl() });
  return singleton;
}
