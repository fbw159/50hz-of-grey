import { formatBerlinDate } from '@/lib/dateUtils';

/** Satirical meeting minutes – shareable text. */
export function buildMeetingProtocol(now: number): string {
  return [
    'PROTOKOLL – Strategische Abstimmung zur netzseitigen Gesamtsituation',
    `Datum: ${formatBerlinDate(now)} · Dauer: 120 Minuten · Teilnehmer: 27`,
    '',
    'TOP 1: Erstellung der eigentlichen Agenda (vertagt)',
    'TOP 2: Lagebewertung – Netz synchron, Stimmung nicht',
    'TOP 3: Frequenz in Prozent visualisieren (Auftrag an Technik)',
    'TOP 4: Taskforce zur Reduzierung der Taskforces (Gründung beschlossen)',
    'TOP 5: Mehr Grün in den Charts (umgesetzt, Situation erheblich verbessert)',
    '',
    'Ergebnis: Folgetermin erforderlich.',
    'Nächster Schritt: Folie 18.',
    '',
    '— generiert von 50 Hz of Grey · Satire —',
  ].join('\n');
}

