import { useEffect, useSyncExternalStore } from 'react';
import { getDataSourceStore, type DataState } from '@/services/dataSource';

/** Subscribe to the central data store (starts it on first use). */
export function useGridData(): DataState {
  const store = getDataSourceStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  useEffect(() => {
    store.start();
  }, [store]);
  return state;
}

export function refreshGridData(): Promise<void> {
  return getDataSourceStore().refresh();
}

/** Example data only on explicit request – never as a silent fallback. */
export function setDemoMode(on: boolean): void {
  getDataSourceStore().setMode(on ? 'demo' : 'auto');
}
