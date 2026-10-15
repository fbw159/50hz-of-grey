/**
 * BÜROKRATIE-INDEX – pure satire. A deterministic "model" that looks
 * scientific, is reproducible for a given day and means absolutely nothing.
 */
import { zonedParts } from '@/lib/dateUtils';
import { hashString } from '@/lib/timeseries';
import { clamp } from '@/lib/formatters';

export interface BureaucracyIndex {
  value: number;
  /** Explanation lines for the info dialog. */
  factors: { label: string; delta: number }[];
  dayKey: string;
}

export function computeBureaucracyIndex(now: number): BureaucracyIndex {
  const p = zonedParts(now);
  const dayKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  const factors: { label: string; delta: number }[] = [];
  const base = 62 + (hashString(`buero-${dayKey}`) % 23); // 62–84
  factors.push({ label: 'Grundlast an Formularen', delta: base });
  if (p.weekday === 1) factors.push({ label: 'Montag: Posteingang vom Wochenende', delta: 6 });
  if (p.weekday === 5 && p.hour >= 12) factors.push({ label: 'Freitagnachmittag: Zuständigkeit bereits im Wochenende', delta: 8 });
  if (p.weekday === 0 || p.weekday === 6) factors.push({ label: 'Wochenende: Sachbearbeitung nicht erreichbar', delta: 11 });
  if (p.hour >= 9 && p.hour < 12) factors.push({ label: 'Kernarbeitszeit: Rückfragen möglich', delta: -7 });
  if (p.hour >= 12 && p.hour < 13) factors.push({ label: 'Mittagspause (bundesweit)', delta: 5 });
  if (p.month === 12 || p.month === 7 || p.month === 8) factors.push({ label: 'Ferienzeit: Vertretungsregelung unklar', delta: 4 });
  const value = clamp(Math.round(factors.reduce((s, f) => s + f.delta, 0)), 0, 100);
  return { value, factors, dayKey };
}

export const BUREAUCRACY_SUBTITLES = [
  'Genehmigungsverfahren läuft seit der Kreidezeit.',
  'Formular 27b/6 wurde erneut angefordert.',
  'Der Antrag auf einen Antrag wurde bewilligt.',
  'Zuständigkeit wird noch geklärt. Seit 2019.',
  'Der Stempel ist unterwegs. Per Fax.',
];
