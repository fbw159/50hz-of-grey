/**
 * GRID PANIC INDEX™ – "Scientifically questionable. Emotionally accurate."
 *
 * A deterministic, transparent formula that mixes real market data with
 * explicitly made-up engineering panic. It is SATIRE and must never be read
 * as a grid-security assessment. The breakdown is shown in the UI.
 */
import { clamp } from '@/lib/formatters';
import { zonedParts } from '@/lib/dateUtils';

export interface PanicInputs {
  /** Current day-ahead price in EUR/MWh (null if unknown). */
  priceEurPerMwh: number | null;
  negativePriceNow: boolean;
  negativeIntervalsToday: number;
  /** Renewable share of load in % (measured). */
  renewableShare: number | null;
  /** |frequency deviation| in mHz. */
  frequencyDeviationMilliHz: number | null;
  /** Wind + solar capacity factor 0–1 (null if unknown). */
  vreCapacityFactor: number | null;
  /** Satirical bureaucracy index 0–100. */
  bureaucracyIndex: number;
  now: number;
}

export interface PanicComponent {
  id: string;
  label: string;
  points: number;
  note: string;
  satire: boolean;
}

export interface PanicResult {
  value: number;
  components: PanicComponent[];
  multiplier: number;
  category: PanicCategory;
}

export interface PanicCategory {
  min: number;
  max: number;
  label: string;
  tone: 'ok' | 'info' | 'warn' | 'critical';
}

export const PANIC_CATEGORIES: PanicCategory[] = [
  { min: 0, max: 20, label: 'Alles ruhig. Verdächtig ruhig.', tone: 'ok' },
  { min: 21, max: 40, label: 'Excel wurde geöffnet.', tone: 'ok' },
  { min: 41, max: 60, label: 'Erste PowerPoint zur Lagebewertung.', tone: 'info' },
  { min: 61, max: 80, label: 'Der Abteilungsleiter fragt nach Redispatch.', tone: 'warn' },
  { min: 81, max: 95, label: 'Außerordentliche Krisensitzung.', tone: 'critical' },
  { min: 96, max: 100, label: 'Management wurde informiert. Jetzt wird es kritisch.', tone: 'critical' },
];

export function panicCategory(value: number): PanicCategory {
  const v = clamp(Math.round(value), 0, 100);
  return PANIC_CATEGORIES.find((c) => v >= c.min && v <= c.max) ?? PANIC_CATEGORIES[0];
}

export function computePanicIndex(input: PanicInputs): PanicResult {
  const c: PanicComponent[] = [];
  c.push({ id: 'base', label: 'Grundpanik', points: 8, note: 'Ingenieure sind nie ganz entspannt.', satire: true });

  if (input.priceEurPerMwh !== null) {
    const p = input.priceEurPerMwh;
    const pts = clamp((p - 60) / 4, 0, 30); // 60 €/MWh → 0, 180 €/MWh → 30
    c.push({ id: 'price', label: 'Day-Ahead-Preisniveau', points: Math.round(pts * 10) / 10, note: `${p.toFixed(2).replace('.', ',')} €/MWh – ab 60 €/MWh steigt der Puls.`, satire: false });
  } else {
    c.push({ id: 'price', label: 'Day-Ahead-Preisniveau', points: 5, note: 'Kein Preis bekannt. Ungewissheit ist auch Panik.', satire: true });
  }

  if (input.negativePriceNow) {
    c.push({ id: 'negative', label: 'Negativer Preis', points: 12, note: 'Negative Preise verwirren das Controlling.', satire: true });
  } else if (input.negativeIntervalsToday > 0) {
    c.push({ id: 'negative', label: 'Negative Intervalle heute', points: clamp(input.negativeIntervalsToday * 0.5, 0, 6), note: `${input.negativeIntervalsToday} Intervalle unter null.`, satire: true });
  }

  if (input.renewableShare !== null) {
    const s = input.renewableShare;
    if (s < 30) c.push({ id: 'ee', label: 'Niedriger EE-Anteil', points: Math.round(((30 - s) / 2) * 10) / 10, note: `${s.toFixed(1).replace('.', ',')} % erneuerbarer Anteil an der Last.`, satire: false });
    else if (s > 75) c.push({ id: 'ee', label: 'Sehr hoher EE-Anteil', points: 6, note: 'Hoher EE-Anteil – jemand fragt bestimmt nach Redispatch.', satire: true });
    else c.push({ id: 'ee', label: 'EE-Anteil', points: 0, note: `${s.toFixed(1).replace('.', ',')} % – unauffällig.`, satire: false });
  }

  if (input.vreCapacityFactor !== null && input.vreCapacityFactor < 0.08) {
    c.push({ id: 'flaute', label: 'Wind- und Solarflaute', points: 8, note: 'Wind + Solar unter 8 % der installierten Leistung.', satire: false });
  }

  if (input.frequencyDeviationMilliHz !== null) {
    const d = Math.abs(input.frequencyDeviationMilliHz);
    c.push({ id: 'freq', label: 'Frequenzabweichung', points: Math.round(clamp(d / 5, 0, 12) * 10) / 10, note: `${Math.round(d)} mHz Abweichung – völlig normal, fühlt sich aber dramatisch an.`, satire: false });
  }

  const p = zonedParts(input.now);
  const h = p.hour;
  if (h >= 6 && h < 9) c.push({ id: 'time', label: 'Morgenrampe', points: 5, note: 'Lastanstieg und erster Kaffee gleichzeitig.', satire: true });
  else if (h >= 17 && h < 21) c.push({ id: 'time', label: 'Abendspitze', points: 8, note: 'PV geht, Last bleibt. Klassiker.', satire: true });
  else if (h >= 1 && h < 5) c.push({ id: 'time', label: 'Nachtschicht', points: -5, note: 'Niemand liest um diese Zeit Mails.', satire: true });

  if (p.weekday === 1) c.push({ id: 'weekday', label: 'Montag', points: 4, note: 'Statistisch die meisten Jour-fixe-Termine.', satire: true });
  else if (p.weekday === 5) c.push({ id: 'weekday', label: 'Freitag', points: -3, note: 'Eskalationen werden auf Montag vertagt.', satire: true });
  else if (p.weekday === 0 || p.weekday === 6) c.push({ id: 'weekday', label: 'Wochenende', points: -6, note: 'Das Management ist offline. Vermutlich.', satire: true });

  const multiplier = 1 + (input.bureaucracyIndex - 50) / 400; // 97 → ×1.1175
  const raw = c.reduce((s, x) => s + x.points, 0) * multiplier;
  const value = clamp(Math.round(raw), 0, 100);
  return { value, components: c, multiplier, category: panicCategory(value) };
}
