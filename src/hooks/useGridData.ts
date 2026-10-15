import { useEffect, useSyncExternalStore } from 'react';
import { getDataSourceStore, type DataState } from '@/services/dataSource';
import { settingsStore } from '@/features/settings/settingsStore';

/** Subscribe to the central data store (starts it on first use). */
export function useGridData(): DataState {
  const store = getDataSourceStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  useEffect(() => {
    store.start();
    // demo mode follows the user setting
    const sync = () => store.setMode(settingsStore.getState().demoMode ? 'demo' : 'auto');
    sync();
    const unsubscribe = settingsStore.subscribe(sync);
    return () => {
      unsubscribe();
    };
  }, [store]);
  return state;
}

export function refreshGridData(): Promise<void> {
  return getDataSourceStore().refresh();
}
