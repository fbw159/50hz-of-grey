import { useMemo } from 'react';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/features/settings/settingsStore';
import { buildIncidents, type Incident } from './incidentEngine';

/** Incident list derived from the current datasets (recomputed every minute). */
export function useIncidents(): Incident[] {
  const data = useGridData();
  const now = useNow(60_000);
  const settings = useSettings();
  return useMemo(() => buildIncidents(data.datasets, now, settings.humor), [data.datasets, now, settings.humor]);
}
