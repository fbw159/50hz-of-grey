import { pickMessage } from '@/lib/humorEngine';

/** Humorous but clear headline for data error states. */
export function errorHeadline(status?: number, offline?: boolean): string {
  if (offline) return pickMessage('error', { seed: 'offline', intensity: 'professional' })?.title ?? 'Verbindung verloren.';
  if (status === 429) return 'Die API möchte gerade weniger Aufmerksamkeit.';
  if (status === 404) return 'Keine Messwerte vorhanden. Excel hilft hier leider auch nicht.';
  return 'Die Datenquelle ist kurz in die Dunkelflaute geraten.';
}

