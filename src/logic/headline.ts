/**
 * The tabloid front page: turns a real measurement into a ridiculously
 * dramatic headline – and always adds the calm, correct truth below it.
 *
 * Each candidate gets a "drama" score; the most dramatic topic wins. Within a
 * topic the wording rotates per time slot so returning visitors see new lines.
 */
import type { FrequencyStatus } from './frequency';
import type { GenerationStatus } from './mix';
import { eurPerMwhToCtPerKwh, formatCt, formatNumber, MINUS } from '@/lib/formatters';
import { formatBerlinTime } from '@/lib/dateUtils';
import { hashString } from '@/lib/timeseries';

export type HeadlineTopic = 'frequency' | 'price' | 'share';

export interface Headline {
  topic: HeadlineTopic;
  /** Text in the yellow starburst. */
  kicker: string;
  /** The headline itself (rendered in capitals). `highlight` marks the part shown in yellow. */
  text: string;
  highlight: string;
  /** "Die Wahrheit:" – the sober, correct explanation. */
  truth: string;
  drama: number;
}

export interface HeadlineInput {
  frequency: FrequencyStatus | null;
  /** current day-ahead price in EUR/MWh */
  priceEurMwh: number | null;
  generation: GenerationStatus | null;
}

function rotate<T>(list: T[], seed: string): T {
  return list[hashString(seed) % list.length];
}

function frequencyHeadline(f: FrequencyStatus, slot: string): Headline {
  const dev = f.roundedMilliHz;
  const abs = Math.abs(dev);
  const hz = formatNumber((50_000 + dev) / 1000, 3);
  const mhz = `${abs} Millihertz`;
  const drama = 0.35 + (Math.min(abs, 200) / 200) * 0.65;
  let options: { kicker: string; text: string; highlight: string }[];
  if (abs <= 2) {
    options = [
      { kicker: 'Sensation', text: `Netz trifft fast exakt 50 Hertz!`, highlight: '50 Hertz' },
      { kicker: 'Unfassbar', text: `Langeweile-Alarm bei ${hz} Hz!`, highlight: `${hz} Hz` },
    ];
  } else if (abs >= 200) {
    options = [{ kicker: 'Ausnahmezustand', text: `Netz-Beben: ${hz} Hertz!`, highlight: `${hz} Hertz` }];
  } else if (abs >= 50) {
    options = [
      { kicker: 'Alarm', text: `Horror-Hertz: ${hz}!`, highlight: hz },
      { kicker: 'Großeinsatz', text: `${mhz} daneben – Regelkraftwerke rücken aus!`, highlight: mhz },
    ];
  } else if (dev < 0) {
    options = [
      { kicker: 'Exklusiv', text: `Netz-Drama um ${mhz}!`, highlight: mhz },
      { kicker: 'Schock', text: `Frequenz sackt auf ${hz} Hz ab!`, highlight: `${hz} Hz` },
      { kicker: 'Unfassbar', text: `${mhz} weg – Mr. Grey fassungslos!`, highlight: mhz },
      { kicker: 'Enthüllt', text: `Wer hat die ${mhz} geklaut?`, highlight: mhz },
    ];
  } else {
    options = [
      { kicker: 'Exklusiv', text: `Übermut! Netz ${mhz} zu schnell!`, highlight: mhz },
      { kicker: 'Rausch', text: `Frequenz-Rausch bei ${hz} Hz!`, highlight: `${hz} Hz` },
      { kicker: 'Skandal', text: `Zu viel Strom! Netz rast mit ${hz} Hz!`, highlight: `${hz} Hz` },
      { kicker: 'Enthüllt', text: `Wer hat ${mhz} zu viel bestellt?`, highlight: mhz },
    ];
  }
  const pick = rotate(options, `f-${slot}`);
  let truth: string;
  if (abs === 0) truth = 'Genau 50,000 Hz. Erzeugung und Verbrauch sind gerade perfekt im Gleichgewicht, das schafft das Netz nur selten auf drei Nachkommastellen.';
  else if (abs <= 2) truth = `Nur ${abs} mHz neben dem Soll. Erzeugung und Verbrauch sind gerade fast perfekt im Gleichgewicht.`;
  else if (abs < 50)
    truth = `${hz} Hz sind völlig normal. Abweichungen bis ±50 mHz sind Alltag, erst bei ±200 mHz arbeitet die gesamte Primärregelleistung Europas.`;
  else if (abs < 200)
    truth = `Das ist eine spürbare Abweichung (${dev > 0 ? '+' : MINUS}${abs} mHz), aber kein Grund zur Sorge. Regelkraftwerke in ganz Europa gleichen gerade automatisch aus.`;
  else if (dev < 0)
    truth = `Das ist selten (${MINUS}${abs} mHz). Jetzt arbeitet die gesamte Primärregelleistung Europas. Erst ab 49,0 Hz würden automatisch Verbraucher abgeschaltet.`;
  else truth = `Das ist selten (+${abs} mHz): viel zu viel Strom im Netz. Jetzt arbeitet die gesamte Primärregelleistung Europas, und ab 50,2 Hz drosseln Solaranlagen automatisch ihre Leistung.`;
  return { topic: 'frequency', ...pick, truth, drama };
}

function priceHeadline(eurMwh: number, slot: string): Headline | null {
  const ct = eurPerMwhToCtPerKwh(eurMwh);
  const ctText = formatCt(ct);
  if (eurMwh < 0) {
    const pick = rotate(
      [
        { kicker: 'Irre', text: 'Strom kostet weniger als nichts!', highlight: 'weniger als nichts' },
        { kicker: 'Verrückt', text: `Börse zahlt fürs Stromverbrauchen!`, highlight: 'zahlt' },
      ],
      `p-${slot}`,
    );
    return {
      topic: 'price',
      ...pick,
      drama: 0.85,
      truth: `An der Börse kostet Strom gerade ${ctText} pro kWh. Bei negativen Preisen zahlen Erzeuger dafür, dass jemand ihren Strom abnimmt, typisch bei viel Wind und Sonne. Zu Hause merkst du davon meist nichts.`,
    };
  }
  if (eurMwh >= 200) {
    const rounded = `${formatNumber(ct, 0)} Cent`;
    return {
      topic: 'price',
      kicker: 'Preis-Hammer',
      text: `Strom kostet ${rounded}!`,
      highlight: rounded,
      drama: eurMwh >= 300 ? 0.8 : 0.55,
      truth: `Das ist der Börsenpreis für diese Viertelstunde (${ctText} pro kWh), ohne Steuern und Netzentgelte. Gerade bestimmen teure Spitzenkraftwerke den Preis. Die meisten Haushaltstarife bleiben trotzdem gleich.`,
    };
  }
  if (eurMwh < 20) {
    return {
      topic: 'price',
      kicker: 'Schnäppchen',
      text: 'Strom fast geschenkt!',
      highlight: 'geschenkt',
      drama: 0.45,
      truth: `An der Börse kostet Strom gerade nur ${ctText} pro kWh. Viel Wind oder Sonne drücken den Preis. Zu Hause zahlst du mit Steuern und Netzentgelten deutlich mehr.`,
    };
  }
  return null;
}

function shareHeadline(g: GenerationStatus): Headline | null {
  const share = g.renewableShareOfLoad;
  if (share === null) return null;
  const pct = `${formatNumber(share, 0)} %`;
  const time = formatBerlinTime(g.t);
  if (share >= 80) {
    return {
      topic: 'share',
      kicker: 'Öko-Rausch',
      text: `${pct} Öko-Strom – Kohle beleidigt!`,
      highlight: pct,
      drama: 0.6,
      truth:
        share > 100
          ? `Um ${time} Uhr lieferten Wind, Sonne, Biomasse und Wasser mehr Strom, als Deutschland verbraucht hat (${pct} des Verbrauchs). Der Überschuss geht ins Ausland oder in Speicher.`
          : `${pct} des Verbrauchs kamen um ${time} Uhr aus Wind, Sonne, Biomasse und Wasser. An windigen, sonnigen Tagen passiert das immer öfter.`,
    };
  }
  if (share <= 25) {
    return {
      topic: 'share',
      kicker: 'Dunkelflaute',
      text: `Nur ${pct} Öko-Strom – Windräder im Streik!`,
      highlight: pct,
      drama: 0.5,
      truth: `Bei wenig Wind und Sonne liefern Kohle, Gas und Importe den Rest (Stand ${time} Uhr). Im Herbst und Winter ist das normal, das Netz bleibt stabil.`,
    };
  }
  return null;
}

/** The front-page headline. Ties between similarly dramatic topics rotate per slot. */
export function buildHeadline(input: HeadlineInput, slot: string): Headline | null {
  const candidates: Headline[] = [];
  if (input.frequency && !input.frequency.stale) candidates.push(frequencyHeadline(input.frequency, slot));
  if (input.priceEurMwh !== null && Number.isFinite(input.priceEurMwh)) {
    const p = priceHeadline(input.priceEurMwh, slot);
    if (p) candidates.push(p);
  }
  if (input.generation) {
    const s = shareHeadline(input.generation);
    if (s) candidates.push(s);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.drama - a.drama);
  const close = candidates.filter((c) => candidates[0].drama - c.drama < 0.15);
  return close[hashString(`h-${slot}`) % close.length];
}
