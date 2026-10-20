/**
 * All jokes in one place. The numbers next to them are always real; the
 * jokes are clearly jokes. Lines are picked deterministically per time slot,
 * so everybody sees the same joke at the same time (and it doesn't flicker).
 */
import type { Mood } from '@/logic/panic';
import type { GenerationCategoryId } from '@/logic/mix';
import { hashString } from '@/lib/timeseries';

export function pick<T>(list: T[], seed: string): T {
  return list[hashString(seed) % list.length];
}

export interface MoodText {
  /** Short verdict shown big under the socket. */
  verdict: string;
  lines: string[];
}

export const MOODS: Record<Mood, MoodText> = {
  zen: {
    verdict: 'tiefenentspannt',
    lines: [
      '50 Hz wie gemalt. In der Leitwarte wird Skat gespielt.',
      'So ruhig war es zuletzt beim Testbild.',
      'Alles im grünen Bereich. Sogar der Kaffee ist noch warm.',
      'Das Netz macht gerade Yoga. Bitte nicht stören.',
    ],
  },
  chill: {
    verdict: 'entspannt',
    lines: [
      'Ein bisschen Wackeln gehört dazu. Wie in jeder guten Beziehung.',
      'Läuft. Nicht perfekt, aber wer ist das schon.',
      'Die Leitwarte hat die Füße hochgelegt. Nur ein bisschen.',
      'Normalbetrieb. Langweilig für uns, gut für alle anderen.',
    ],
  },
  nervous: {
    verdict: 'leicht nervös',
    lines: [
      'Irgendwer hat gerade sehr viele Wasserkocher gleichzeitig eingeschaltet.',
      'Die Leitwarte trommelt mit den Fingern auf dem Tisch.',
      'Noch kein Grund zur Sorge. Aber der zweite Kaffee ist schon aufgesetzt.',
      'Das Netz schaut kurz besorgt auf die Wetterkarte.',
    ],
  },
  sweaty: {
    verdict: 'am Schwitzen',
    lines: [
      'Teurer Strom, wenig Wind, viel Bedarf. Die Leitwarte lockert die Krawatte.',
      'Jetzt bitte nicht alle gleichzeitig die Sauna anwerfen.',
      'Im Kraftwerk wird gerade jeder Knopf gedrückt, der grün leuchtet.',
      'Das Netz schwitzt. Zum Glück ist es wasserdicht. Hoffentlich.',
    ],
  },
  panic: {
    verdict: 'in Panik',
    lines: [
      'Alle Mann an die Regler! (Keine Sorge: Echte Netzbetreiber bleiben ruhiger als diese Steckdose.)',
      'Hier blinkt alles rot. Die Steckdose übertreibt aber gern.',
      'Großalarm in der Leitwarte. Die Kaffeemaschine wurde vorsorglich abgeschaltet.',
    ],
  },
};

export const LOADING_TEXT = { verdict: 'wird gemessen', line: 'Moment, ich halte kurz den Finger rein. Nur Spaß, niemals nachmachen!' };
export const ERROR_TEXT = {
  verdict: 'nicht erreichbar',
  line: 'Die Datenquelle antwortet gerade nicht. Versuch es gleich nochmal oder schau dir Beispieldaten an.',
};

/** What the socket says when you poke it. */
export const SOCKET_POKES = [
  'Finger weg, ich stehe unter Spannung!',
  'Aua. 230 Volt sind kein Spielzeug.',
  'Ich bin eine Steckdose, kein Knopf.',
  'Hihi, das kitzelt in der Phase.',
  'Noch einmal und ich löse den FI aus.',
  'Schuko heißt Schutzkontakt. Also bitte: Kontakt mit Schutz.',
  'Steck lieber was Sinnvolles ein. Den Wasserkocher zum Beispiel.',
  'Ich habe zwei Löcher und trotzdem den Durchblick.',
];

/* -------------------------------- Frequency ------------------------------- */

export const FREQUENCY_LINES: Record<Mood, string[]> = {
  zen: ['Ruhepuls. Das Netz schläft fast ein.', 'Ein Puls wie ein Mönch.'],
  chill: ['Normaler Puls. Ganz Europa tanzt im Takt.', 'Leichtes Zittern, völlig normal.'],
  nervous: ['Der Puls geht hoch. Irgendwo fehlt gerade Leistung oder ist zu viel da.', 'Ein kleiner Ausreißer. Die Regelreserve arbeitet schon.'],
  sweaty: ['Deutliche Abweichung. Die Regelkraftwerke legen sich ins Zeug.', 'Das ist selten. Die Leitwarten in Europa schauen jetzt genauer hin.'],
  panic: ['Sehr große Abweichung! So etwas kommt nur alle paar Jahre vor.'],
};

/* ---------------------------------- Price --------------------------------- */

export type PriceMood = 'negative' | 'cheap' | 'normal' | 'pricey' | 'ouch';

export function priceMood(eurMwh: number): PriceMood {
  if (eurMwh < 0) return 'negative';
  if (eurMwh < 50) return 'cheap';
  if (eurMwh < 150) return 'normal';
  if (eurMwh < 250) return 'pricey';
  return 'ouch';
}

export const PRICE_TEXT: Record<PriceMood, { tag: string; lines: string[] }> = {
  negative: {
    tag: 'Geld zurück!',
    lines: [
      'Negativer Preis: Wer jetzt Strom abnimmt, bekommt an der Börse Geld dafür. Die Waschmaschine ist offiziell ein Geschäftsmodell.',
      'Zu viel Strom, zu wenig Abnehmer. Die Börse zahlt fürs Verbrauchen. Verrückte Welt.',
    ],
  },
  cheap: {
    tag: 'Spottbillig',
    lines: ['Schnäppchen-Alarm an der Börse. Jetzt wäre ein guter Moment für die Waschmaschine.', 'Billig wie lange nicht. Sonne oder Wind haben gute Laune.'],
  },
  normal: {
    tag: 'Ganz normal',
    lines: ['Ein ganz normaler Börsenpreis. Nichts zu sehen, bitte weitergehen.', 'Durchschnitt. Die Börse gähnt.'],
  },
  pricey: {
    tag: 'Teuer',
    lines: ['Teure Stunden. Meist laufen dann viele Gaskraftwerke.', 'Die Börse zieht die Preise an. Licht aus, wo es nicht gebraucht wird.'],
  },
  ouch: {
    tag: 'Autsch',
    lines: ['Richtig teuer gerade. Die Kraftwerke mit den höchsten Kosten bestimmen jetzt den Preis.', 'Autsch. Wer jetzt Strom an der Börse kauft, braucht starke Nerven.'],
  },
};

/* ------------------------------- Generation ------------------------------- */

export interface SourceInfo {
  label: string;
  emoji: string;
  color: string;
}

export const SOURCES: Record<GenerationCategoryId, SourceInfo> = {
  solar: { label: 'Sonne', emoji: '☀️', color: '#F2B200' },
  windOnshore: { label: 'Wind an Land', emoji: '🌬️', color: '#3E86C6' },
  windOffshore: { label: 'Wind auf See', emoji: '🌊', color: '#1E4F86' },
  biomass: { label: 'Biomasse', emoji: '🌱', color: '#5C9A3C' },
  hydro: { label: 'Wasserkraft', emoji: '💧', color: '#6FB7C8' },
  lignite: { label: 'Braunkohle', emoji: '🟫', color: '#7A5230' },
  hardCoal: { label: 'Steinkohle', emoji: '⚫', color: '#2F3437' },
  gas: { label: 'Erdgas', emoji: '🔥', color: '#E0703A' },
  pumpedStorage: { label: 'Pumpspeicher', emoji: '🔋', color: '#8C6BB8' },
  other: { label: 'Müll, Öl & Co.', emoji: '🗑️', color: '#9AA09B' },
};

/** One witty caption per source, depending on what it is doing right now. */
export function sourceCaption(id: GenerationCategoryId, mw: number, utilisation: number | null, isNight: boolean): string {
  const gw = mw / 1000;
  switch (id) {
    case 'solar':
      if (gw < 0.05) return isNight ? 'Schläft. Es ist dunkel, das ist normal.' : 'Hat sich hinter Wolken versteckt.';
      if (utilisation !== null && utilisation < 0.1) return 'Blinzelt nur kurz raus.';
      if (utilisation !== null && utilisation < 0.3) return 'Arbeitet ordentlich.';
      return 'Gibt Vollgas. Sonnencreme nicht vergessen.';
    case 'windOnshore':
    case 'windOffshore':
      if (utilisation !== null && utilisation < 0.1) return 'Flaute. Die Windräder machen Pause.';
      if (utilisation !== null && utilisation < 0.3) return 'Weht so mittel.';
      if (utilisation !== null && utilisation < 0.5) return 'Bläst ordentlich.';
      return 'Sturm! Die Windräder drehen voll auf.';
    case 'lignite':
      return gw > 12 ? 'Läuft auf Hochtouren. Die alte Dame kann es noch.' : 'Die alte Dame des Netzes. Läuft und läuft.';
    case 'hardCoal':
      return gw < 3 ? 'Fast im Ruhestand. Kommt nur noch aushelfen.' : 'Hilft gerade kräftig mit.';
    case 'gas':
      return gw > 10 ? 'Springt ein, wenn es eng wird. Und es ist eng.' : 'Steht bereit, wenn es eng wird.';
    case 'biomass':
      return 'Läuft gleichmäßig. Wie ein sehr fleißiger Komposthaufen.';
    case 'hydro':
      return 'Plätschert gemütlich vor sich hin.';
    case 'pumpedStorage':
      return gw > 2 ? 'Lässt Wasser bergab rauschen und macht Strom draus.' : 'Hält Wasser in Reserve.';
    case 'other':
      return 'Müllverbrennung, Öl, Grubengas und der Rest.';
  }
}

/* ---------------------------------- Facts --------------------------------- */

export const FACTS: string[] = [
  '50 Hz heißt: Die Spannung schwingt 50-mal pro Sekunde hin und her. Der Strom wechselt also 100-mal pro Sekunde die Richtung.',
  'Von Portugal bis in die Türkei hängen über 20 Länder am selben Takt. Wenn die Frequenz in Freiburg wackelt, wackelt sie auch in Lissabon.',
  'Fällt die Frequenz auf 49,0 Hz, werden automatisch Verbraucher abgeschaltet. Das nennt sich Lastabwurf und soll den Rest retten.',
  'Bei 200 mHz Abweichung arbeitet die gesamte Primärregelleistung Europas: rund 3.000 Megawatt, verteilt auf viele Kraftwerke und Batterien.',
  '2018 gingen in Europa Uhren in Backöfen und Radioweckern bis zu sechs Minuten nach. Grund: Die Frequenz war wochenlang ein kleines bisschen zu niedrig.',
  'Die verlorenen Minuten wurden danach zurückgeholt: Die Netzbetreiber ließen die Frequenz eine Zeit lang leicht über 50 Hz laufen.',
  'Am 8. Januar 2021 ist das europäische Netz kurz in zwei Teile zerfallen. Im Nordwesten sank die Frequenz auf 49,74 Hz. Gemerkt hat das kaum jemand.',
  'Der Börsenstrompreis für morgen wird jeden Mittag in einer Auktion ermittelt, inzwischen für jede Viertelstunde einzeln.',
  'Bei negativen Strompreisen zahlen Erzeuger Geld dafür, dass ihnen jemand den Strom abnimmt. Das passiert vor allem an sonnigen Wochenenden und Feiertagen.',
  'In Deutschland stecken über 100 Gigawatt Solarleistung auf Dächern und Feldern. An sonnigen Mittagen kommt oft mehr als die Hälfte des Stroms von dort.',
  'Ein Pumpspeicherwerk ist eine Batterie aus Wasser: Bei Stromüberschuss wird Wasser bergauf gepumpt, bei Bedarf rauscht es durch die Turbine wieder runter.',
  'Die Schuko-Steckdose stammt aus Bayern: Albert Büttner hat sie in den 1920er-Jahren erfunden. Schuko heißt Schutzkontakt.',
  'Europa fährt 50 Hz, Nordamerika 60 Hz. Japan hat beides: Der Osten läuft mit 50, der Westen mit 60 Hz.',
  'Dunkelflaute heißt: kaum Wind und kaum Sonne, oft mehrere Tage im Winter. Dann liefern Kohle, Gas, Biomasse und Importe.',
  'Wenn die Leitungen von Nord nach Süd voll sind, wird im Norden Wind abgeregelt und im Süden ein Kraftwerk hochgefahren. Das heißt Redispatch und kostet Milliarden.',
  'Die Netzfrequenz hier wird in Freiburg gemessen, beim Fraunhofer ISE. Sie ist im ganzen europäischen Verbundnetz praktisch gleich.',
];
