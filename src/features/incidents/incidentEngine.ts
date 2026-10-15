/**
 * GRID INCIDENT REPORTS – the alarm journal.
 *
 * Two kinds of entries:
 *  1. data-driven entries (isSatire = false): triggered by real values and
 *     explicit, transparent thresholds. Their wording may be dry, but the
 *     statement itself is true.
 *  2. pure satire entries (isSatire = true): clearly marked, deterministic
 *     per time slot, never derived from a measurement.
 */
import type { DatasetMap } from '@/types/data';
import type { HumorIntensity, HumorSeverity } from '@/data/jokes';
import { pickMany, rotationSlot } from '@/lib/humorEngine';
import { getPriceOverview, HIGH_PRICE_THRESHOLD, LOW_PRICE_THRESHOLD } from '@/features/prices/priceMetrics';
import { getGenerationStatus } from '@/features/production/productionMetrics';
import { getFrequencyStatus } from '@/features/frequency/frequencyMetrics';
import { getDefconStatus } from '@/features/dunkelflaute/defcon';
import { formatPrice, formatPercent, formatPower, formatMilliHz, formatNumber } from '@/lib/formatters';
import { formatAge, formatBerlinTime, HOUR, MINUTE } from '@/lib/dateUtils';

export type IncidentCategory = 'Markt' | 'Erzeugung' | 'Frequenz' | 'Daten' | 'Satire' | 'Management';

export interface Incident {
  id: string;
  t: number;
  severity: HumorSeverity;
  category: IncidentCategory;
  title: string;
  /** Shown when the entry is tapped. */
  explanation: string;
  isSatire: boolean;
}

export const EE_HIGH_THRESHOLD = 70; // % of load
export const PV_CHANGE_THRESHOLD_MW = 5000;
export const FREQ_NOTABLE_MHZ = 50;
export const STALE_AFTER_MS = 45 * MINUTE;

export function buildIncidents(datasets: DatasetMap, now: number, intensity: HumorIntensity): Incident[] {
  const list: Incident[] = [];
  const isDemo = Object.values(datasets).some((d) => d?.origin === 'demo');

  if (isDemo) {
    list.push({
      id: 'demo',
      t: now,
      severity: 'warning',
      category: 'Daten',
      title: 'DEMO – simulierte Daten aktiv',
      explanation: 'Alle angezeigten Werte sind plausible Beispieldaten und keine Messwerte. Demo-Modus in den Einstellungen abschalten, um echte Daten zu laden.',
      isSatire: false,
    });
  }

  const price = getPriceOverview(datasets.price, now);
  if (price) {
    if (price.current && price.current.value < 0) {
      list.push({
        id: 'price-negative-now',
        t: price.current.start,
        severity: 'success',
        category: 'Markt',
        title: `Negativer Day-Ahead-Preis: ${formatPrice(price.current.value)}`,
        explanation: `Für das Intervall ab ${formatBerlinTime(price.current.start)} Uhr liegt der Day-Ahead-Großhandelspreis (DE-LU) unter null. Das passiert bei hoher Einspeisung und geringer Nachfrage – der Haushaltsstrompreis wird dadurch nicht negativ.`,
        isSatire: false,
      });
    } else if (price.today.negativeCount > 0) {
      const run = price.today.negativeRuns[0];
      list.push({
        id: 'price-negative-today',
        t: run?.start ?? now,
        severity: 'info',
        category: 'Markt',
        title: `Heute ${price.today.negativeCount} negative Preisintervalle (${formatNumber(price.today.negativeMinutes, 0)} min)`,
        explanation: `Der Day-Ahead-Preis war heute in ${price.today.negativeCount} Intervallen negativ, Tagesminimum ${formatPrice(price.today.min)}.`,
        isSatire: false,
      });
    }
    if (price.current && price.current.value > HIGH_PRICE_THRESHOLD) {
      list.push({
        id: 'price-high',
        t: price.current.start,
        severity: 'warning',
        category: 'Markt',
        title: `Day-Ahead-Preis über ${HIGH_PRICE_THRESHOLD} €/MWh: ${formatPrice(price.current.value)}`,
        explanation: `Selbst gewählte Schwelle: ${HIGH_PRICE_THRESHOLD} €/MWh. Hohe Day-Ahead-Preise treten typischerweise in der Abendspitze oder bei geringer Wind- und PV-Einspeisung auf, wenn Gaskraftwerke preissetzend sind.`,
        isSatire: false,
      });
    } else if (price.current && price.current.value >= 0 && price.current.value < LOW_PRICE_THRESHOLD) {
      list.push({
        id: 'price-low',
        t: price.current.start,
        severity: 'info',
        category: 'Markt',
        title: `Day-Ahead-Preis unter ${LOW_PRICE_THRESHOLD} €/MWh: ${formatPrice(price.current.value)}`,
        explanation: `Selbst gewählte Schwelle: ${LOW_PRICE_THRESHOLD} €/MWh. Niedrige Großhandelspreise entstehen bei hoher Einspeisung aus Wind und PV.`,
        isSatire: false,
      });
    }
    if (price.tomorrow && price.tomorrow.count > 0) {
      list.push({
        id: 'price-tomorrow',
        t: Math.min(now, price.tomorrow.points[0].t - 11 * HOUR),
        severity: 'info',
        category: 'Markt',
        title: `Day-Ahead-Preise für morgen verfügbar (Ø ${formatPrice(price.tomorrow.avg, 0)})`,
        explanation: `Die Auktionsergebnisse für morgen liegen vor: Minimum ${formatPrice(price.tomorrow.min)}, Maximum ${formatPrice(price.tomorrow.max)}, ${price.tomorrow.negativeCount} negative Intervalle.`,
        isSatire: false,
      });
    }
  }

  const gen = getGenerationStatus(datasets.publicPower, now);
  if (gen) {
    if (gen.renewableShareOfLoad !== null && gen.renewableShareOfLoad >= EE_HIGH_THRESHOLD) {
      list.push({
        id: 'ee-high',
        t: gen.t,
        severity: 'success',
        category: 'Erzeugung',
        title: `Erneuerbarer Anteil an der Last: ${formatPercent(gen.renewableShareOfLoad)}`,
        explanation: `Schwelle ${EE_HIGH_THRESHOLD} %. Bezugsgröße ist die Last (öffentliche Nettoerzeugung), Zeitpunkt ${formatBerlinTime(gen.t)} Uhr.`,
        isSatire: false,
      });
    }
    if (gen.solarChange1hMw !== null && Math.abs(gen.solarChange1hMw) >= PV_CHANGE_THRESHOLD_MW) {
      const up = gen.solarChange1hMw > 0;
      list.push({
        id: 'pv-change',
        t: gen.t,
        severity: 'info',
        category: 'Erzeugung',
        title: `PV-Erzeugung in einer Stunde um ${formatPower(Math.abs(gen.solarChange1hMw))} ${up ? 'gestiegen' : 'gefallen'}`,
        explanation: `Schwelle ${formatPower(PV_CHANGE_THRESHOLD_MW)}. Solche Rampen sind morgens und abends normal – sie müssen von regelbaren Kraftwerken und Speichern ausgeglichen werden.`,
        isSatire: false,
      });
    }
    if (gen.ageMs > 3 * HOUR) {
      list.push({
        id: 'gen-stale',
        t: gen.t,
        severity: 'warning',
        category: 'Daten',
        title: `Erzeugungsdaten ${formatAge(gen.ageMs)} (Stand ${formatBerlinTime(gen.t)} Uhr)`,
        explanation: 'Die öffentliche Nettoerzeugung wird mit Verzögerung veröffentlicht. Ältere Werte als etwa zwei Stunden deuten auf eine Verzögerung bei der Datenquelle oder beim Snapshot hin.',
        isSatire: false,
      });
    }
  }

  const defcon = getDefconStatus(datasets.publicPower, datasets.installedPower, now, 12);
  if (defcon && defcon.cf !== null && defcon.cf < 0.08) {
    list.push({
      id: 'vre-low',
      t: defcon.t,
      severity: 'warning',
      category: 'Erzeugung',
      title: `Wind + Solar bei ${formatPercent(defcon.cf * 100, 0)} der installierten Leistung`,
      explanation: `Heuristik: Wind + PV unter 8 % der installierten Leistung${defcon.lowHours >= 1 ? `, seit ${formatNumber(defcon.lowHours, 0)} h unter 10 %` : ''}. Geringe Einspeisung ist kein Indikator für Netzinstabilität – die Residuallast wird von anderen Kraftwerken gedeckt.`,
      isSatire: false,
    });
  }

  const freq = getFrequencyStatus(datasets.frequency, now);
  if (freq) {
    if (Math.abs(freq.deviationMilliHz) >= FREQ_NOTABLE_MHZ) {
      list.push({
        id: 'freq-dev',
        t: freq.t,
        severity: 'info',
        category: 'Frequenz',
        title: `Frequenzabweichung ${formatMilliHz(freq.deviationHz)} (innerhalb des normalen Bereichs)`,
        explanation: `Messwert ${formatNumber(freq.value, 3)} Hz in ${freq.region}. Abweichungen von einigen zehn mHz sind im Normalbetrieb üblich; die Primärregelung greift kontinuierlich. Dies ist keine Warnstufe.`,
        isSatire: false,
      });
    }
    if (freq.stale) {
      list.push({
        id: 'freq-stale',
        t: freq.t,
        severity: 'warning',
        category: 'Daten',
        title: `Frequenzmessung ${formatAge(freq.ageMs)}`,
        explanation: 'Der letzte Frequenzwert ist älter als 20 Minuten. Die Anzeige zeigt weiterhin den letzten echten Messwert – keine Schätzung.',
        isSatire: false,
      });
    }
  }

  const stale = (['price', 'publicPower', 'frequency'] as const).filter((k) => {
    const ds = datasets[k];
    return ds && now - ds.fetchedAt > STALE_AFTER_MS && ds.origin !== 'demo';
  });
  if (stale.length) {
    const oldest = Math.max(...stale.map((k) => now - (datasets[k]!.fetchedAt)));
    list.push({
      id: 'data-stale',
      t: now - oldest,
      severity: 'warning',
      category: 'Daten',
      title: `Datenstand ${formatAge(oldest)} – Aktualisierung ausstehend`,
      explanation: 'Die letzte erfolgreiche Datenaktualisierung liegt länger zurück. Angezeigt werden die letzten gültigen Werte mit ihrem Zeitstempel.',
      isSatire: false,
    });
  }

  // --- satire entries (clearly marked) ------------------------------------
  if (intensity !== 'professional') {
    const slot = rotationSlot(now, 20);
    const count = intensity === 'unhinged' ? 5 : 3;
    const ops = pickMany('gridOps', count, { seed: `ops-${slot}`, intensity });
    const mgmt = pickMany('management', intensity === 'unhinged' ? 2 : 1, { seed: `mgmt-${slot}`, intensity });
    const slotStart = slot * 20 * MINUTE;
    [...ops, ...mgmt].forEach((msg, i) => {
      list.push({
        id: `satire-${msg.id}-${slot}`,
        t: Math.min(now, slotStart + i * 3 * MINUTE + 37_000),
        severity: msg.severity,
        category: msg.category === 'management' ? 'Management' : 'Satire',
        title: msg.title,
        explanation: 'Satirische Meldung ohne Datenbezug. Keine Netzzustandsinformation.',
        isSatire: true,
      });
    });
  }

  return list.sort((a, b) => b.t - a.t);
}
