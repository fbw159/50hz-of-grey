/**
 * All jokes in one place. The numbers next to them are always real; the
 * jokes are clearly jokes (cheeky, never explicit). Lines are picked
 * deterministically per time slot, so everybody sees the same joke at the
 * same time (and it doesn't flicker).
 */
import type { Mood } from '@/logic/panic';
import type { GenerationCategoryId } from '@/logic/mix';
import type { WeatherBlock, WeatherKind } from '@/logic/weather';
import { hashString } from '@/lib/timeseries';

export function pick<T>(list: T[], seed: string): T {
  return list[hashString(seed) % list.length];
}

/** The socket's name. */
export const SOCKET_NAME = 'Mr. Grey';

/** Name of the 0–100 fun index. */
export const INDEX_NAME = 'Erregungs-Index';

export interface MoodText {
  /** Short verdict shown big under the socket. */
  verdict: string;
  lines: string[];
}

export const MOODS: Record<Mood, MoodText> = {
  zen: {
    verdict: 'tiefenentspannt',
    lines: [
      '50 Hz wie gemalt. Mr. Grey liegt im Bademantel auf dem Sofa.',
      'Wechselstrom eben: rein, raus, 50-mal pro Sekunde. Völlig entspannt.',
      'Kein Zittern, kein Stöhnen. Nur pure Harmonie im Netz.',
      'So ruhig, dass in der Leitwarte schon Kerzen angezündet werden.',
      'Die Apokalypse hat heute frei. Sie liegt mit Mr. Grey auf dem Sofa.',
    ],
  },
  chill: {
    verdict: 'entspannt',
    lines: [
      'Ein leichtes Kribbeln. Ganz normal bei 230 Volt.',
      'Ein bisschen Wackeln gehört dazu. Wie in jeder guten Beziehung.',
      'Normalbetrieb. Langweilig für uns, gut für alle anderen.',
      'Die Spannung ist da, aber niemand übertreibt.',
      'Der Weltuntergang wurde auf unbestimmte Zeit verschoben. Schon wieder.',
    ],
  },
  nervous: {
    verdict: 'leicht erregt',
    lines: [
      'Die Generatoren erhöhen die Erregung. Rein technisch, versteht sich.',
      'Die Spannung steigt. Irgendwer hat sehr viele Wasserkocher gleichzeitig angemacht.',
      'Mr. Grey wird unruhig und zupft an seiner Krawatte.',
      'Noch alles im Rahmen. Aber es knistert.',
      'Die ersten Prepper zählen ihre Dosenravioli. Kein Grund zur Sorge, die zählen immer.',
    ],
  },
  sweaty: {
    verdict: 'ganz schön heiß',
    lines: [
      'Teurer Strom, wenig Wind, viel Bedarf. Hier wird es heiß unter dem Schutzkontakt.',
      'Die Leitwarte lockert die Krawatte. Und nicht nur die.',
      'Jetzt bitte nicht alle gleichzeitig die Sauna anwerfen.',
      'Es wird schwitzig. Die Regelkraftwerke geben alles.',
      'Endzeitstimmung in der Leitwarte. Jemand hat das Notfall-Kuchenfach geöffnet.',
    ],
  },
  panic: {
    verdict: 'außer Kontrolle',
    lines: [
      'Safeword! Safeword! (Es lautet übrigens „Lastabwurf“.)',
      'Zu viel Spannung. Selbst Mr. Grey braucht jetzt eine kalte Dusche.',
      'Hier blinkt alles rot. Keine Sorge: Echte Netzbetreiber bleiben cooler als diese Steckdose.',
      'Die vier Reiter der Apokalypse sind da: Flaute, Lastspitze, Gaspreis und ein vergessener Wasserkocher.',
    ],
  },
};

export const LOADING_TEXT = { verdict: 'beim Aufwärmen', line: 'Moment, Mr. Grey macht sich noch frisch. Die Daten kommen gleich.' };
export const ERROR_TEXT = {
  verdict: 'nicht in Stimmung',
  line: 'Die Datenquelle antwortet gerade nicht. Versuch es gleich nochmal oder schau dir Beispieldaten an.',
};

/** Every tenth poke. */
export const SHORT_CIRCUIT = 'KURZSCHLUSS! Siehst du, was du angerichtet hast? Zum Glück hab ich einen FI-Schalter.';

/** What the socket says when you poke it. */
export const SOCKET_POKES = [
  'Nicht so stürmisch! Wir kennen uns doch kaum.',
  'Finger weg, ich stehe unter Spannung!',
  'Ich habe einen Schutzkontakt. Und klare Grenzen.',
  'Hey! Ich bin nicht so eine Steckdose.',
  'Zwei Löcher, 230 Volt, sucht passenden Stecker. Schuko bevorzugt.',
  'Unser Safeword ist „Lastabwurf“. Merk dir das.',
  'Noch einmal und ich löse den FI aus.',
  'Du willst Spannung? Ich hab 230 Volt.',
  'Nur mit trockenen Händen, bitte. Ich bin da empfindlich.',
  'Hihi, das kitzelt in der Phase.',
  'Mach nur so weiter, dann gibt es einen Kurzschluss. Und dann ist die Welt dunkel. Deine Schuld.',
  'Ich habe den Weltuntergang schon dreimal überlebt. Du bist harmlos.',
];

/** Dating profile of the socket ("Steckbrief" – a pun in German). */
export const PROFILE_CHIPS = [
  '⚡ 230 Volt',
  '🎵 50 Hz, sehr regelmäßig',
  '🛡️ Schutzkontakt',
  '🕯️ Kerzenschein zur Lastspitze',
  '🎬 Armageddon, wegen der Spannung',
  '🥫 Notfallplan: Dosenravioli',
  '🚫 nasse Finger',
  '🗝️ Safeword: Lastabwurf',
];

export const PROFILE_REPLIES = {
  like: [
    'Es hat gefunkt! Mr. Grey freut sich auf deinen Stecker. Aber bitte mit Schutzkontakt.',
    'Match! Mr. Grey ist ganz erregt. Rein technisch, versteht sich.',
    'Volle Spannung! Mr. Grey schreibt dir gleich. Mit 50 Nachrichten pro Sekunde.',
  ],
  nope: [
    'Kein Problem. Mr. Grey ist trotzdem für dich da. Rund um die Uhr, mit 230 Volt.',
    'Autsch. Mr. Grey löst innerlich den FI aus. Er kommt drüber hinweg.',
    'Weiter? Es gibt nur eine Steckdose in deinem Leben, die so geerdet ist.',
  ],
};

/* -------------------------------- Frequency ------------------------------- */

export const FREQUENCY_LINES: Record<Mood, string[]> = {
  zen: ['Ruhepuls. Er ist völlig entspannt.', 'Puls wie nach einer Massage.'],
  chill: ['Leichtes Zittern. Er mag das.', 'Ganz Europa bewegt sich im selben Takt. Romantisch, oder?'],
  nervous: ['Der Puls geht hoch. Irgendwo fehlt gerade Leistung oder es ist zu viel da.', 'Ein kleiner Ausreißer. Die Regelreserve greift schon beherzt zu.'],
  sweaty: ['Deutliche Abweichung. Jetzt wird geschwitzt, auch in den Regelkraftwerken.', 'Das ist selten. Die Leitwarten in Europa schauen jetzt ganz genau hin.'],
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
      'Negativer Preis: Man wird fürs Abnehmen bezahlt. Klingt unanständig, ist aber Strombörse.',
      'Ein unmoralisches Angebot: Die Börse zahlt dir Geld, wenn du ihr den Strom abnimmst.',
      'Die Welt steht kopf: Strom kostet weniger als nichts. Ökonomen suchen Schutz im Keller.',
    ],
  },
  cheap: {
    tag: 'Spottbillig',
    lines: ['Schnäppchen! Wind und Sonne sind heute sehr großzügig.', 'So günstig, dass die Waschmaschine schon ungeduldig mit der Trommel wackelt.'],
  },
  normal: {
    tag: 'Ganz normal',
    lines: ['Ein ganz normaler Preis. Kein Grund, rot zu werden.', 'Durchschnitt. Die Börse liegt entspannt in der Löffelchenstellung.'],
  },
  pricey: {
    tag: 'Teuer',
    lines: [
      'Teuer. Für diesen Preis erwartet man eigentlich mehr als nur Strom.',
      'Die Börse spielt die Unnahbare. Meist laufen dann viele Gaskraftwerke.',
      'Bei dem Preis wird der Toaster zum Luxusgut.',
    ],
  },
  ouch: {
    tag: 'Autsch',
    lines: [
      'Autsch. Das ist kein Spaß mehr, das ist Schmerz. Und zwar nicht die angenehme Sorte.',
      'Richtig teuer. Jetzt bestimmen die Kraftwerke mit den höchsten Kosten den Preis.',
      'Endzeit-Preise. Wer jetzt Strom kauft, bezahlt mit Gold und Dosenravioli.',
    ],
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

/** One cheeky caption per source, depending on what it is doing right now. */
export function sourceCaption(id: GenerationCategoryId, mw: number, utilisation: number | null): string {
  const gw = mw / 1000;
  switch (id) {
    case 'solar':
      // practically nothing only happens when it is dark (even a grey winter day brings gigawatts)
      if (gw < 0.05) return 'Schläft. Mit Augenmaske, es ist ja dunkel.';
      if (utilisation !== null && utilisation < 0.1) return 'Zeigt sich nur kurz. Ziert sich ein bisschen.';
      if (utilisation !== null && utilisation < 0.3) return 'Wärmt ordentlich auf.';
      return 'Gibt alles. Sonnencreme nicht vergessen, es wird heiß.';
    case 'windOnshore':
    case 'windOffshore':
      if (utilisation !== null && utilisation < 0.1) return 'Flaute. Heute nur heiße Luft.';
      if (utilisation !== null && utilisation < 0.3) return 'Bläst so mittel.';
      if (utilisation !== null && utilisation < 0.65) return 'Bläst ordentlich.';
      return 'Sturm! Die Rotoren drehen völlig durch.';
    case 'lignite':
      return gw > 12 ? 'Läuft auf Hochtouren. Braun, ausdauernd, ein bisschen schmutzig.' : 'Die alte Dame des Netzes. Verlässlich und ein bisschen schmutzig.';
    case 'hardCoal':
      return gw < 3 ? 'Kommt nur noch selten. Aber wenn, dann richtig.' : 'Heizt kräftig mit.';
    case 'gas':
      return gw > 10 ? 'Gibt Gas, denn es wird eng.' : 'Gibt Gas, wenn es eng wird.';
    case 'biomass':
      return 'Bio, gleichmäßig, ausdauernd. Der Langstreckenläufer im Mix.';
    case 'hydro':
      return 'Plätschert gemütlich vor sich hin. Wasserspiele inklusive.';
    case 'pumpedStorage':
      return gw > 2 ? 'Lässt das Wasser bergab rauschen und macht Strom draus.' : 'Hält sich zurück und spart es sich für später auf.';
    case 'other':
      return 'Müll, Öl, Kohlegase und Krümel. Die Schmuddelecke des Strommixes.';
  }
}

export function tradeText(netImportMw: number, gwText: string): string {
  return netImportMw > 0
    ? `Deutschland holt sich gerade ${gwText} aus dem Ausland. Offene Beziehung, ganz normal in Europa.`
    : `Deutschland gibt gerade ${gwText} ans Ausland ab. Teilen ist sexy.`;
}

/* ---------------------------------- Facts --------------------------------- */

export const FACTS: string[] = [
  '50 Hz heißt: Die Spannung schwingt 50-mal pro Sekunde hin und her. Der Strom wechselt also 100-mal pro Sekunde die Richtung.',
  'Von Portugal bis in die Türkei hängen über 20 Länder am selben Takt. Wenn die Frequenz in Freiburg zittert, zittert sie auch in Lissabon.',
  'Fällt die Frequenz auf 49,0 Hz, werden automatisch Verbraucher abgeschaltet. Das nennt sich Lastabwurf und ist das Safeword des Stromnetzes.',
  'Bei 200 mHz Abweichung arbeitet die gesamte Primärregelleistung Europas: rund 3.000 Megawatt, verteilt auf viele Kraftwerke und Batterien.',
  'Erregung ist ein echter Fachbegriff: Der Erregerstrom erzeugt das Magnetfeld im Generator. Mehr Erregung, mehr Blindleistung. Kein Witz.',
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
  'Weltuntergang? Eher nicht: 2024 war jeder Stromkunde in Deutschland im Schnitt 11,7 Minuten ohne Strom. Im ganzen Jahr. Das Netz gehört zu den zuverlässigsten der Welt.',
  'Nach einem großen Blackout kommt der Schwarzstart: Wasserkraftwerke und andere Anlagen fahren ohne Strom von außen hoch und bauen das Netz Stück für Stück wieder auf.',
  'Der Grauton dieser Seite ist RAL 7035 Lichtgrau, die Farbe vieler Schaltschränke. Das klassische RAL-Register kennt 38 Grautöne. Fünfzig wären uns lieber gewesen.',
];

/* ------------------------------- Doom clock ------------------------------- */

export function doomLine(minutes: number): string {
  if (minutes > 40) return 'Die Apokalypse hat heute frei.';
  if (minutes > 20) return 'Die Apokalypse schaut kurz durchs Fenster und geht wieder.';
  if (minutes > 10) return 'Die Apokalypse zieht sich schon mal die Schuhe an.';
  return 'Es klingelt. Vermutlich nur der Paketbote. Vermutlich.';
}

/* ---------------------------------- Ticker -------------------------------- */

/** Absurd breaking news, mixed with the real numbers in the ticker. */
export const TICKER_SATIRE: string[] = [
  'Experten warnen vor zu viel Normalität',
  'Windrad in Brandenburg dreht sich aus Protest linksherum',
  'Kohlekraftwerk bucht Wellness-Wochenende',
  'Leitwarte meldet: Kaffeevorrat kritisch',
  'Bundesamt für Weltuntergang: heute leider nichts',
  'Mr. Grey fordert mehr Schutzkontakt',
  'Prepper kaufen Kerzen, Kerzenindustrie jubelt',
  'Apokalypse wegen stabiler Netzfrequenz abgesagt',
  'Wasserkocher-Gewerkschaft droht mit Halbzeitpause',
  'Mehrfachsteckdose in Reihe gesteckt, Feuerwehr schüttelt den Kopf',
  'Sonne geht morgen wieder auf, bestätigen Astronomen',
  'Wärmepumpe verliebt sich in Pufferspeicher',
  'Toaster verweigert Dienst bei Börsenpreisen über 20 Cent',
  'Stromzähler dreht sich so schnell, dass er abhebt',
];

export const TICKER_FREQUENCY: Record<Mood, string> = {
  zen: 'Netz so ruhig, dass Seismografen Langeweile melden',
  chill: 'Leichtes Zittern, Europa tanzt im Takt',
  nervous: 'Regelreserve greift beherzt zu',
  sweaty: 'Leitwarten in ganz Europa lockern die Krawatten',
  panic: 'Safeword wird vorsorglich bereitgehalten',
};

/* --------------------------------- Not-Aus -------------------------------- */

export const BLACKOUT_STEPS = {
  boom: { title: 'Blackout!', text: 'Ganz Deutschland ist dunkel. Der Kühlschrank tropft, das WLAN ist weg, die Zivilisation wankt.' },
  restart: { title: 'Schwarzstart läuft …', text: 'Ein Wasserkraftwerk fährt hoch, dann Insel für Insel der Rest. Mr. Grey hält die Luft an.' },
  done: {
    title: 'Licht ist wieder an!',
    text: 'In echt dauert ein Schwarzstart viele Stunden. Zum Glück ist ein großer Blackout in Deutschland sehr unwahrscheinlich: 2024 waren es im Schnitt 11,7 Minuten Stromausfall pro Kunde. Im ganzen Jahr.',
  },
};

/* ------------------------------- Front page ------------------------------- */

/** What Mr. Grey says on the front page, by mood. */
export const QUOTES: Record<Mood, string[]> = {
  zen: [
    'Ich bin so entspannt, ich könnte glatt Gleichstrom machen.',
    'Läuft bei mir. Wechselnd, aber läuft.',
    'Pssst. Ich meditiere auf 50 Hertz.',
  ],
  chill: [
    'Ein bisschen Kribbeln gehört dazu.',
    'Alles im grünen Bereich. Fast schon langweilig.',
    'Ich bleibe locker. Ich bin schließlich geerdet.',
  ],
  nervous: [
    'Ich zittere am ganzen Kontakt!',
    'Wer hat da schon wieder den Wasserkocher angemacht?',
    'Ich bin nicht nervös. Ich schwinge nur.',
  ],
  sweaty: [
    'Mir ist heiß! Hat jemand einen Lüfter?',
    'Ich brauche dringend eine Abkühlung. Und Regelleistung.',
    'Ich schwitze Elektronen!',
  ],
  panic: ['Holt mich hier raus, ich bin eine Steckdose!', 'Safeword! SAFEWORD!', 'Das ist das Ende! Oder ein Wackelkontakt.'],
};

/* ------------------------------ Wer ist schuld? --------------------------- */

/** Frequency below 50 Hz: too little generation or too much consumption somewhere in Continental Europe. */
export const CULPRITS_LOW = [
  'ein Wasserkocher in Lissabon, der heimlich Teewasser kocht',
  'Tante Erikas Bügeleisen in Castrop-Rauxel',
  'eine Wolke, die sich frech vor eine Solaranlage in Würzburg geschoben hat',
  'die Halbzeitpause eines Fußballspiels in Madrid',
  'ein Föhn in Wien, der seit 20 Minuten läuft',
  'ein Kühlschrank in Palermo, der gerade anspringt',
  'eine Sauna in Bottrop',
  'ein Rechenzentrum in Frankfurt, das eine KI auf Steckdosen-Witze trainiert',
  'ein Windrad in Brandenburg, das Mittagspause macht',
  'eine Pizzeria in Neapel, die ausnahmsweise elektrisch backt',
  'ein Gamer in Warschau mit drei Grafikkarten',
  'eine Waschmaschine in Athen im Schleudergang',
];

/** Frequency above 50 Hz: too much generation or too little consumption. */
export const CULPRITS_HIGH = [
  'ein Windrad in Ostfriesland mit Übermut',
  'die Sonne über Bayern, die einfach nicht aufhören will',
  'ein Wasserkraftwerk in den Alpen, das zu viel Kaffee hatte',
  'ein Aluminiumwerk in Rotterdam, das Feierabend macht',
  'Mr. Grey persönlich. Er hat einfach zu viel Energie',
  'ein Pumpspeicher in Thüringen, der Wasser bergab rauschen lässt',
  'eine Solaranlage auf einem Kuhstall im Allgäu',
  'tausend Wäschetrockner in Athen, die gleichzeitig fertig sind',
  'ein E-Auto in Bukarest, das voll ist und aufhört zu laden',
  'halb Polen, das gleichzeitig den Fernseher ausmacht',
  'eine Biogasanlage in Niedersachsen nach dem Bohneneintopf',
];

export function blameTruth(deviationMilliHz: number): string {
  if (Math.abs(deviationMilliHz) <= 2) return 'In Wahrheit: Erzeugung und Verbrauch sind gerade fast perfekt im Gleichgewicht. Niemand ist schuld. Wie langweilig.';
  return deviationMilliHz < 0
    ? 'In Wahrheit: In ganz Kontinentaleuropa wird gerade ein kleines bisschen mehr Strom verbraucht als erzeugt. Dann sinkt die Frequenz, und die Regelreserve gleicht automatisch aus.'
    : 'In Wahrheit: In ganz Kontinentaleuropa wird gerade ein kleines bisschen mehr Strom erzeugt als verbraucht. Dann steigt die Frequenz, und die Regelreserve gleicht automatisch aus.';
}

/* ------------------------------- Netz-Wetter ------------------------------ */


export const WEATHER_EMOJI: Record<WeatherKind, string> = {
  storm: '🌪️',
  windy: '🌬️',
  sunny: '☀️',
  cloudy: '⛅',
  flaute: '🌑',
  night: '🌙',
  mixed: '🌥️',
  unknown: '🔮',
};

const gw = (v: number | null) => (v === null ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v));

export function weatherLine(b: WeatherBlock): string {
  switch (b.kind) {
    case 'storm':
      return `Stürmisch! Windstrom bis ${gw(b.windMaxGw)} GW. Die Windräder drehen durch, die Kohle macht Pause.`;
    case 'windy':
      return `Windig mit im Schnitt ${gw(b.windGw)} GW Windstrom. Die Frisur sitzt nicht, das Netz schon.`;
    case 'sunny':
      return `Sonnig! Solarstrom bis ${gw(b.solarMaxGw)} GW. Sonnenbrille auf, Börsenpreis runter.`;
    case 'cloudy':
      return `Heiter bis wolkig, Solarstrom bis ${gw(b.solarMaxGw)} GW${b.windGw !== null ? `, dazu ${gw(b.windGw)} GW Wind` : ''}.`;
    case 'flaute':
      return `Dunkelflaute-Gefahr: nur ${gw(b.windGw)} GW Wind${b.solarGw !== null && b.solarGw >= 0.5 ? ` und ${gw(b.solarGw)} GW Sonne` : ''}. Gas und Kohle ziehen schon mal die Jacke an.`;
    case 'night':
      if (b.windGw === null) return 'Es ist dunkel (Überraschung!). Die Solaranlagen haben Feierabend.';
      return b.windGw >= 15
        ? `Dunkel, aber windig: im Schnitt ${gw(b.windGw)} GW Windstrom. Die Windräder machen Nachtschicht.`
        : `Es ist dunkel (Überraschung!) und eher ruhig: im Schnitt ${gw(b.windGw)} GW Wind.`;
    case 'mixed': {
      const parts = [b.windGw !== null ? `${gw(b.windGw)} GW Wind` : null, b.solarGw !== null ? `${gw(b.solarGw)} GW Sonne` : null].filter(Boolean);
      return `Durchwachsen: ${parts.join(', ')}. Von allem ein bisschen.`;
    }
    case 'unknown':
      return 'Der Wetterfrosch ist noch im Urlaub: Für diese Zeit gibt es noch keine Wind- und Solarprognose.';
  }
}
