/**
 * Central humour database. Every message is either satire (isSatire: true)
 * or a neutral technical caption (isSatire: false). The humour engine picks
 * from here deterministically – see src/lib/humorEngine.ts.
 */

export type HumorIntensity = 'professional' | 'engineer' | 'unhinged';
export type HumorSeverity = 'info' | 'success' | 'warning' | 'critical';
export type HumorTrigger = 'data' | 'time' | 'random' | 'interaction';

export interface HumorMessage {
  id: string;
  category: HumorCategory;
  severity: HumorSeverity;
  title: string;
  description?: string;
  triggerType: HumorTrigger;
  isSatire: boolean;
  /** Minimum humour intensity at which this message may appear. Default: engineer. */
  minIntensity?: HumorIntensity;
}

export type HumorCategory =
  | 'subtitle'
  | 'systemStatus'
  | 'frequency'
  | 'frequencyNeutral'
  | 'price'
  | 'priceNegative'
  | 'priceHigh'
  | 'priceLow'
  | 'priceNeutral'
  | 'renewables'
  | 'renewablesNeutral'
  | 'solarDay'
  | 'solarNight'
  | 'solarLow'
  | 'solarNeutral'
  | 'windHigh'
  | 'windLow'
  | 'windNeutral'
  | 'eeHigh'
  | 'fossilHigh'
  | 'bureaucracy'
  | 'gridOps'
  | 'management'
  | 'oracleHigh'
  | 'oracleNegative'
  | 'oracleNormal'
  | 'oracleLow'
  | 'dailySummary'
  | 'excuse'
  | 'doNotPress'
  | 'excel'
  | 'simulation'
  | 'reactiveGood'
  | 'reactiveMedium'
  | 'reactiveBad'
  | 'reactiveTerrible'
  | 'redispatch'
  | 'error';

let counter = 0;
function m(category: HumorCategory, title: string, opts: Partial<Omit<HumorMessage, 'id' | 'category' | 'title'>> = {}): HumorMessage {
  counter += 1;
  return {
    id: `${category}-${counter}`,
    category,
    title,
    severity: opts.severity ?? 'info',
    description: opts.description,
    triggerType: opts.triggerType ?? 'random',
    isSatire: opts.isSatire ?? true,
    minIntensity: opts.minIntensity,
  };
}

const unhinged = { minIntensity: 'unhinged' as HumorIntensity };
const neutral = { isSatire: false, minIntensity: 'professional' as HumorIntensity };

export const HUMOR_CATALOG: HumorMessage[] = [
  // --- app subtitles -------------------------------------------------------
  m('subtitle', 'Keeping the lights on. Against all odds.', { minIntensity: 'professional' }),
  m('subtitle', 'Das Netz hält. Die Nerven nicht.'),
  m('subtitle', 'Powered by electrons and questionable decisions.'),
  m('subtitle', 'Die Energiewende ist kein Bug. Sie ist ein Feature.'),
  m('subtitle', '99,9 % Verfügbarkeit. 0 % emotionale Stabilität.'),
  m('subtitle', 'Deutschland im elektrischen Ausnahmezustand. Also Dienstag.'),
  m('subtitle', 'Engineering excellence meets administrative chaos.'),
  m('subtitle', 'Wir regeln das. Irgendwie.'),
  m('subtitle', 'The grid is stable. The engineers are not.'),

  // --- animated system status --------------------------------------------
  m('systemStatus', 'NETZ EXISTIERT NOCH', { severity: 'success' }),
  m('systemStatus', 'INGENIEUR ANWESEND', { severity: 'success' }),
  m('systemStatus', 'BÜROKRATIE AKTIV', { severity: 'warning' }),
  m('systemStatus', 'STATUS: TECHNISCH KOMPLIZIERT', { severity: 'warning' }),
  m('systemStatus', 'KAFFEE: AUSREICHEND', { severity: 'success' }),
  m('systemStatus', 'EXCEL: GEÖFFNET', { severity: 'info' }),
  m('systemStatus', 'MEETING: LÄUFT NOCH', { severity: 'warning', ...unhinged }),
  m('systemStatus', 'SYNCHRON. VERMUTLICH.', { severity: 'success' }),

  // --- frequency -----------------------------------------------------------
  m('frequencyNeutral', 'Netzfrequenz, Messung Fraunhofer ISE Freiburg', neutral),
  m('frequencyNeutral', 'Synchronzone Kontinentaleuropa, Sekundenauflösung', neutral),
  m('frequency', 'Die 50 sind eher eine Empfehlung.'),
  m('frequency', 'Synchronität ist eine Lebenseinstellung.'),
  m('frequency', 'Die rotierenden Massen geben ihr Bestes.'),
  m('frequency', 'Das europäische Verbundnetz atmet.'),
  m('frequency', 'Regelenergie macht Überstunden.'),
  m('frequency', '50 Hz sind ein Ziel, kein Lifestyle.'),
  m('frequency', 'Die Synchronmaschinen halten die Stellung.'),
  m('frequency', 'Eine Nachkommastelle weniger und das Management wäre zufrieden.'),
  m('frequency', 'Die Frequenz ist stabiler als unsere Projektplanung.'),
  m('frequency', 'Primärregelung: still, effizient, unbedankt.'),
  m('frequency', 'Die Netzzeit geht nach. Niemand hat das Netz gefragt.', unhinged),
  m('frequency', 'Jede Abweichung ist ein stiller Hilferuf der Regelzone.', unhinged),

  // --- price ---------------------------------------------------------------
  m('priceNeutral', 'Day-Ahead-Großhandelspreis, Gebotszone DE-LU', neutral),
  m('priceNeutral', 'Nicht der Haushaltsstrompreis.', neutral),
  m('price', 'Der Markt regelt. Manchmal sogar in die richtige Richtung.'),
  m('price', 'Der Merit-Order-Effekt hat wieder zugeschlagen.'),
  m('price', 'Die Strombörse ist heute emotional volatil.'),
  m('price', 'Der Endkunde merkt davon erstaunlich wenig.'),
  m('price', 'Viertelstundenpreise: weil Stunden zu entspannt waren.'),
  m('price', 'Der Preis ist korrekt. Die Reaktion darauf nicht.', unhinged),
  m('priceNegative', 'Strom wird jetzt rückwärts bezahlt.', { severity: 'success', triggerType: 'data' }),
  m('priceNegative', 'Der Markt hat kurz die Vorzeichen verwechselt.', { severity: 'success', triggerType: 'data' }),
  m('priceNegative', 'Ein negatives Geschäftsmodell mit Zukunft.', { severity: 'success', triggerType: 'data' }),
  m('priceNegative', 'Die Börse hat gerade einen Kurzschluss im Taschenrechner.', { severity: 'success', triggerType: 'data' }),
  m('priceNegative', 'Negative Preise: Kapitalismus mit umgekehrtem Vorzeichen.', { severity: 'success', triggerType: 'data' }),
  m('priceNegative', 'Excel hat den negativen Preis als Fehler markiert.', { severity: 'success', triggerType: 'data' }),
  m('priceHigh', 'Der Markt verlangt heute Schmerzensgeld.', { severity: 'warning', triggerType: 'data' }),
  m('priceHigh', 'Gaskraftwerke setzen den Preis. Und die Stimmung.', { severity: 'warning', triggerType: 'data' }),
  m('priceHigh', 'Die Merit Order hat ganz hinten jemanden geweckt.', { severity: 'warning', triggerType: 'data' }),
  m('priceHigh', 'Spitzenlast. Spitzenpreis. Spitzenlaune im Controlling.', { severity: 'warning', triggerType: 'data', ...unhinged }),
  m('priceLow', 'Fast geschenkt. Fast.', { triggerType: 'data' }),
  m('priceLow', 'Der Großhandel verschenkt heute Elektronen mit Preisschild.', { triggerType: 'data' }),
  m('priceLow', 'So billig war Strom zuletzt im Physikunterricht.', { triggerType: 'data', ...unhinged }),

  // --- renewables / generation --------------------------------------------
  m('renewablesNeutral', 'Erneuerbarer Anteil an der Last (öffentliche Nettoerzeugung)', neutral),
  m('renewables', 'Wind und Sonne machen unbezahlte Überstunden.'),
  m('renewables', 'Die Sonne hält sich nicht an den Fahrplan.'),
  m('renewables', 'Windprognose und Realität führen eine Fernbeziehung.'),
  m('renewables', 'Die Erneuerbaren liefern. Das Wetter hat nur manchmal andere Prioritäten.'),
  m('solarNeutral', 'Photovoltaik, öffentliche Nettoerzeugung', neutral),
  m('solarDay', 'Die Sonne hat heute Schicht.', { triggerType: 'data' }),
  m('solarDay', 'Die Photovoltaikabteilung hat heute die Sonne persönlich eingeladen.', { triggerType: 'data' }),
  m('solarDay', 'Mittagsspitze. Die Wechselrichter summen zufrieden.', { triggerType: 'data' }),
  m('solarDay', 'PV liefert. Die Residuallast nimmt sich frei.', { triggerType: 'data' }),
  m('solarNight', 'PV-Abteilung geschlossen. Morgen wieder.', { triggerType: 'time', minIntensity: 'professional', isSatire: true }),
  m('solarNight', 'PV-Kraftwerke nutzen die Nacht für strategische Neuausrichtung.', { triggerType: 'time' }),
  m('solarNight', 'Die Photovoltaik ist nachts bemerkenswert zuverlässig bei null.', { triggerType: 'time' }),
  m('solarNight', 'Null Gigawatt. Exakt wie prognostiziert.', { triggerType: 'time' }),
  m('solarLow', 'Die Sonne ist da. Sagt zumindest der Kalender.', { triggerType: 'data' }),
  m('solarLow', 'Wolken haben die Mittagsspitze abgesagt.', { triggerType: 'data' }),
  m('solarLow', 'PV-Anlagen produzieren heute hauptsächlich Enttäuschung.', { triggerType: 'data', ...unhinged }),
  m('windNeutral', 'Wind Onshore + Offshore, öffentliche Nettoerzeugung', neutral),
  m('windHigh', 'Die Windräder drehen durch.', { triggerType: 'data' }),
  m('windHigh', 'Windenergie liefert. Der Projektmanager macht schon LinkedIn-Posts.', { triggerType: 'data' }),
  m('windHigh', 'Der Wind lässt sich nicht vom Projektplan beeindrucken.', { triggerType: 'data' }),
  m('windHigh', 'Nordsee liefert. Süddeutschland fragt nach der Leitung.', { triggerType: 'data' }),
  m('windLow', 'Heute eher dekorative Landschaftselemente.', { triggerType: 'data' }),
  m('windLow', 'Windpark meldet Betriebsurlaub.', { triggerType: 'data' }),
  m('windLow', 'Die Windparks befinden sich im passiven Networking.', { triggerType: 'data' }),
  m('windLow', 'Die Rotoren drehen sich. Aus Höflichkeit.', { triggerType: 'data', ...unhinged }),
  m('eeHigh', 'Die Erneuerbaren übernehmen heute die Tagschicht.', { severity: 'success', triggerType: 'data' }),
  m('eeHigh', 'Erneuerbare dominieren. Die Kohlekraftwerke scrollen gelangweilt.', { severity: 'success', triggerType: 'data' }),
  m('fossilHigh', 'Die thermischen Kraftwerke haben noch nicht gekündigt.', { severity: 'warning', triggerType: 'data' }),
  m('fossilHigh', 'Kohle und Gas halten heute den Laden am Laufen. Ungern.', { severity: 'warning', triggerType: 'data' }),
  m('fossilHigh', 'Die Residuallast hat Hunger. Die Gasturbinen kochen.', { severity: 'warning', triggerType: 'data' }),

  // --- bureaucracy ---------------------------------------------------------
  m('bureaucracy', 'Genehmigungsverfahren läuft seit der Kreidezeit.'),
  m('bureaucracy', 'Formular 27b/6 wurde erneut angefordert.'),
  m('bureaucracy', 'Der Antrag auf einen Antrag wurde bewilligt.'),
  m('bureaucracy', 'Zuständigkeit wird noch geklärt. Seit 2019.'),
  m('bureaucracy', 'Der Stempel ist unterwegs. Per Fax.'),
  m('bureaucracy', 'Die Umweltverträglichkeitsprüfung prüft gerade sich selbst.', unhinged),

  // --- grid operations -----------------------------------------------------
  m('gridOps', 'N-1 ist keine neue Boyband.'),
  m('gridOps', 'Redispatch: Weil Elektronen keine Postleitzahlen lesen.'),
  m('gridOps', 'Die Spannung ist hoch. Auch im Projektteam.'),
  m('gridOps', 'Blindleistung arbeitet im Hintergrund und bekommt keinen Applaus.'),
  m('gridOps', 'Das Netz ist vermascht. Die Zuständigkeiten leider auch.'),
  m('gridOps', 'Wenn alles funktioniert, war es selbstverständlich. Wenn nicht, war es die Netzplanung.'),
  m('gridOps', 'Ein Transformator ist seit 40 Jahren in Betrieb und hat sich noch nie über seine Work-Life-Balance beschwert.'),
  m('gridOps', 'Ein Windrad hat Wind festgestellt.'),
  m('gridOps', 'Blindleistung existiert weiterhin. Controlling fragt nach dem Umsatz.'),
  m('gridOps', 'Neue PowerPoint mit 184 Folien zur Netzstabilität eingetroffen.', { severity: 'warning' }),
  m('gridOps', 'Netz weiterhin synchron. Niemand weiß, wie lange die Besprechung noch dauert.', { severity: 'success' }),
  m('gridOps', 'Der Schaltplan ist aktuell. Stand 1998.'),
  m('gridOps', 'Die Schutztechnik hat ausgelöst. Wie immer korrekt, wie immer unbequem.'),
  m('gridOps', 'Kuppelleitung meldet: Nachbarn sind auch nur Menschen.'),
  m('gridOps', 'Der Netzbetreiber bittet um Verständnis. Und um Blindleistung.'),
  m('gridOps', 'Die Leitwarte hat den dritten Kaffee angefordert. Primärreserve für Menschen.', unhinged),
  m('gridOps', 'Die Schwungmassen möchten in Ruhe gelassen werden.'),

  // --- management ----------------------------------------------------------
  m('management', 'Bitte visualisieren Sie die Spannung in Prozent.'),
  m('management', 'Können wir die Netzfrequenz nicht einfach agiler machen?'),
  m('management', 'Wir brauchen eine Taskforce zur Reduzierung der Taskforces.'),
  m('management', 'Ist die Dunkelflaute im Budget berücksichtigt?'),
  m('management', 'Können wir die Blindleistung nicht verkaufen?'),
  m('management', 'Bitte machen Sie den Netzengpass bis Freitag grün.'),
  m('management', 'Management möchte die Frequenz auf 60 Hz optimieren.', { severity: 'critical' }),
  m('management', 'Kann das Netz nicht einfach in die Cloud?'),
  m('management', 'Wir sollten die Elektronen stärker incentivieren.'),
  m('management', 'Die Netzfrequenz ist kein KPI. Noch nicht.', unhinged),
  m('management', 'Bitte eine Folie, die alles erklärt. Ohne Zahlen.'),
  m('management', 'Netz synchron. Management leider auch online.'),

  // --- price oracle (satirical management advice) --------------------------
  m('oracleHigh', 'Empfehlung: Kaffeemaschine nur noch zu Spitzenlastzeiten ausschalten.', { triggerType: 'data' }),
  m('oracleHigh', 'Empfehlung: Die Beleuchtung im Meetingraum dimmen. Das Meeting bleibt.', { triggerType: 'data' }),
  m('oracleHigh', 'Empfehlung: Energieeinsparung durch Verzicht auf Reply-All.', { triggerType: 'data' }),
  m('oracleNegative', 'Empfehlung: Jetzt möglichst viele PowerPoints rendern.', { triggerType: 'data' }),
  m('oracleNegative', 'Empfehlung: Alle Laptops laden. Auch die ohne Akku.', { triggerType: 'data' }),
  m('oracleNegative', 'Empfehlung: Wärmepumpe auf „Sauna“.', { triggerType: 'data' }),
  m('oracleNormal', 'Empfehlung: Arbeitsgruppe gründen.', { triggerType: 'data' }),
  m('oracleNormal', 'Empfehlung: Lagebild erstellen. Dann Lagebild zum Lagebild.', { triggerType: 'data' }),
  m('oracleNormal', 'Empfehlung: Abwarten und Tee auf Vorrat kochen.', { triggerType: 'data' }),
  m('oracleLow', 'Empfehlung: Jetzt die Elektroheizung des Konferenzraums testen.', { triggerType: 'data' }),
  m('oracleLow', 'Empfehlung: Günstig. Trotzdem eine Folie dazu machen.', { triggerType: 'data' }),

  // --- daily summary templates --------------------------------------------
  m('dailySummary', 'Die Elektronen machen heute einen soliden Job.', { triggerType: 'data' }),
  m('dailySummary', 'Netzlage unauffällig. Die Besprechungslage nicht.', { triggerType: 'data' }),
  m('dailySummary', 'Ein Tag wie jeder andere: physikalisch stabil, organisatorisch offen.', { triggerType: 'data' }),

  // --- engineer's excuses --------------------------------------------------
  m('excuse', 'Das liegt am Netz.', { triggerType: 'interaction' }),
  m('excuse', 'Das ist ein Problem der Regelungstechnik.', { triggerType: 'interaction' }),
  m('excuse', 'Das war in der Simulation noch stabil.', { triggerType: 'interaction' }),
  m('excuse', 'Die Randbedingungen haben sich geändert.', { triggerType: 'interaction' }),
  m('excuse', 'Das ist normativ nicht eindeutig definiert.', { triggerType: 'interaction' }),
  m('excuse', 'Wir brauchen zunächst eine Sensitivitätsanalyse.', { triggerType: 'interaction' }),
  m('excuse', 'Die Messung ist plausibel. Leider.', { triggerType: 'interaction' }),
  m('excuse', 'Das ist historisch gewachsen.', { triggerType: 'interaction' }),
  m('excuse', 'Bitte einen Termin mit dem Netzbetreiber vereinbaren.', { triggerType: 'interaction' }),
  m('excuse', 'Das ist ein Problem der Harmonisierung auf europäischer Ebene.', { triggerType: 'interaction' }),
  m('excuse', 'Der Oberschwingungsgehalt war so nicht abgestimmt.', { triggerType: 'interaction' }),
  m('excuse', 'Das Modell ist korrekt. Die Realität weicht ab.', { triggerType: 'interaction' }),
  m('excuse', 'Dafür gibt es noch keine Norm.', { triggerType: 'interaction' }),
  m('excuse', 'Das ist im Lastenheft nicht vorgesehen gewesen.', { triggerType: 'interaction' }),
  m('excuse', 'Die Kalibrierung läuft aus. Seit 2021.', { triggerType: 'interaction' }),
  m('excuse', 'Im Testfeld war das Verhalten reproduzierbar anders.', { triggerType: 'interaction' }),

  // --- DO NOT PRESS --------------------------------------------------------
  m('doNotPress', 'Sie haben soeben versucht, das europäische Verbundnetz neu zu starten.', { severity: 'critical', triggerType: 'interaction', description: 'Zugriff verweigert. Zum Glück.' }),
  m('doNotPress', 'Netzneustart abgelehnt. Das Netz läuft seit 1950 und möchte nicht gestört werden.', { severity: 'critical', triggerType: 'interaction', description: 'Zugriff weiterhin verweigert.' }),
  m('doNotPress', 'Ihr Antrag auf Blackout wurde an die zuständige Stelle weitergeleitet.', { severity: 'critical', triggerType: 'interaction', description: 'Bearbeitungszeit: 14 Jahre.' }),
  m('doNotPress', 'Der Knopf hat Ihre Eingabe protokolliert und ignoriert.', { severity: 'critical', triggerType: 'interaction', description: 'Mit freundlichen Grüßen, die Schutztechnik.' }),
  m('doNotPress', 'Der Schwarzstart wurde auf unbestimmte Zeit vertagt.', { severity: 'critical', triggerType: 'interaction', description: 'Es fehlt eine Folie.' }),
  m('doNotPress', 'Sie sind nicht berechtigt. Niemand ist berechtigt. Das ist der Sinn.', { severity: 'critical', triggerType: 'interaction', description: 'Zugriff verweigert.' }),

  // --- Excel ---------------------------------------------------------------
  m('excel', 'Problem erfolgreich in eine neue Tabelle verschoben.', { severity: 'success', triggerType: 'interaction' }),
  m('excel', 'Problem erfolgreich in Tabelle2 verschoben. Tabelle1 bleibt vorsichtshalber offen.', { severity: 'success', triggerType: 'interaction' }),
  m('excel', 'SVERWEIS hat das Problem nicht gefunden. #NV.', { severity: 'success', triggerType: 'interaction' }),
  m('excel', 'Problem als Pivot-Tabelle neu zusammengefasst. Es ist jetzt bunter.', { severity: 'success', triggerType: 'interaction' }),

  // --- simulation messages -------------------------------------------------
  m('simulation', 'Primärregelung hat die Nachricht erhalten.', { triggerType: 'interaction' }),
  m('simulation', 'Sekundärregelung sucht gerade ihre Zugangsdaten.', { triggerType: 'interaction' }),
  m('simulation', 'Das Management fordert eine Frequenz von 100 %.', { triggerType: 'interaction' }),
  m('simulation', 'Die Schwungmassen möchten in Ruhe gelassen werden.', { triggerType: 'interaction' }),
  m('simulation', 'Lastabwurf wurde freundlich, aber bestimmt abgelehnt.', { triggerType: 'interaction' }),
  m('simulation', 'Die Trägheit bittet um etwas mehr Trägheit.', { triggerType: 'interaction' }),

  // --- reactive power verdicts ---------------------------------------------
  m('reactiveGood', 'Vorbildlich. Die Blindleistungspolizei ist zufrieden.', { severity: 'success', triggerType: 'interaction' }),
  m('reactiveGood', 'cos φ nahe eins. Der Transformator schickt Grüße.', { severity: 'success', triggerType: 'interaction' }),
  m('reactiveMedium', 'Kompensationsanlage denkt über ihre Zukunft nach.', { severity: 'warning', triggerType: 'interaction' }),
  m('reactiveMedium', 'Akzeptabel. Aber jemand hat die Kondensatoren vergessen.', { severity: 'warning', triggerType: 'interaction' }),
  m('reactiveBad', 'Ihr Transformator möchte ein ernstes Gespräch führen.', { severity: 'critical', triggerType: 'interaction' }),
  m('reactiveBad', 'Der Netzbetreiber hat Ihre Nummer. Nicht für Komplimente.', { severity: 'critical', triggerType: 'interaction' }),
  m('reactiveTerrible', 'Herzlichen Glückwunsch. Sie transportieren hauptsächlich Beziehungen zwischen Spannung und Strom.', { severity: 'critical', triggerType: 'interaction' }),
  m('reactiveTerrible', 'Das ist kein Leistungsfaktor mehr, das ist eine Haltung.', { severity: 'critical', triggerType: 'interaction' }),

  // --- redispatch ----------------------------------------------------------
  m('redispatch', 'Redispatch angefordert. Das Excel-Makro wurde emotional.', { triggerType: 'interaction' }),
  m('redispatch', 'Nord-Süd-Übertragung sucht ein besseres Betriebsklima.', { triggerType: 'interaction' }),
  m('redispatch', 'Netzausbau wurde für 2047 in den Kalender eingetragen.', { triggerType: 'interaction' }),
  m('redispatch', 'Engpass behoben. Kostenstelle nicht gefunden.', { triggerType: 'interaction' }),
  m('redispatch', 'Die Leitung ist voll. Die Mailbox des Netzplaners auch.', { triggerType: 'interaction' }),
  m('redispatch', 'Elektronen im Norden, Nachfrage im Süden. Klassisches Beziehungsproblem.', { triggerType: 'interaction' }),

  // --- errors --------------------------------------------------------------
  m('error', 'Die Datenquelle ist kurz in die Dunkelflaute geraten.', { severity: 'warning', triggerType: 'data', minIntensity: 'professional' }),
  m('error', 'Die API möchte gerade weniger Aufmerksamkeit.', { severity: 'warning', triggerType: 'data', minIntensity: 'professional' }),
  m('error', 'Keine Messwerte vorhanden. Excel hilft hier leider auch nicht.', { severity: 'warning', triggerType: 'data', minIntensity: 'professional' }),
  m('error', 'Verbindung verloren. Die Elektronen waren es vermutlich nicht.', { severity: 'warning', triggerType: 'data', minIntensity: 'professional' }),
  m('error', 'Der Markt hat die morgigen Preise noch nicht verraten.', { severity: 'info', triggerType: 'data', minIntensity: 'professional' }),
];

/** Rotating "engineer facts" – real, short, correct. */
export const ENGINEER_FACTS: { title: string; text: string }[] = [
  { title: 'Blindleistung', text: 'Blindleistung verrichtet im Mittel keine Wirkarbeit, kann aber Betriebsmittel erheblich belasten – sie pendelt zwischen Quelle und Verbraucher hin und her und erhöht den Strom auf der Leitung.' },
  { title: 'Netzfrequenz', text: 'Im kontinentaleuropäischen Verbundnetz schwankt die Frequenz im Normalbetrieb meist nur um wenige zehn Millihertz um 50 Hz. Erst ab ±200 mHz spricht man von einer größeren Störung.' },
  { title: 'Leistung vs. Energie', text: 'Leistung (MW) ist die Rate, Energie (MWh) die Menge. Eine Anlage mit 10 MW liefert in einer Stunde 10 MWh – und in einer Viertelstunde 2,5 MWh.' },
  { title: 'Day-Ahead-Markt', text: 'Day-Ahead-Preise entstehen in einer Auktion am Vortag, seit Oktober 2025 in 15-Minuten-Intervallen. Der Preis ist ein Großhandelspreis, nicht der Haushaltstarif.' },
  { title: 'Merit Order', text: 'Im Day-Ahead-Markt setzt das teuerste noch benötigte Kraftwerk den Preis für alle. Fällt viel Wind und PV an, rutschen teure Kraftwerke aus der Einsatzreihenfolge – der Preis sinkt.' },
  { title: 'Negative Preise', text: 'Negative Preise entstehen, wenn mehr Erzeugung als Nachfrage angeboten wird und Anlagen lieber zahlen als abschalten – etwa wegen Förderlogik oder technischer Mindestlast.' },
  { title: 'Residuallast', text: 'Residuallast = Last minus Einspeisung aus Wind und PV. Sie muss von regelbaren Kraftwerken, Speichern und Importen gedeckt werden.' },
  { title: 'Trägheit', text: 'Rotierende Massen der Synchronmaschinen puffern Leistungsungleichgewichte in den ersten Sekunden. Weniger konventionelle Kraftwerke heißt weniger Trägheit – und schnellere Frequenzänderungen.' },
  { title: 'Primärregelung', text: 'Die Primärregelung (FCR) reagiert innerhalb von Sekunden proportional zur Frequenzabweichung und ist europaweit mit insgesamt rund 3000 MW dimensioniert.' },
  { title: 'Redispatch', text: 'Beim Redispatch wird die Einspeisung von Kraftwerken vor und hinter einem Netzengpass gegenläufig angepasst, damit die Leitung nicht überlastet wird – die Gesamterzeugung bleibt gleich.' },
  { title: 'Öffentliche Nettoerzeugung', text: 'Energy-Charts weist die öffentliche Nettostromerzeugung aus: Erzeugung für das öffentliche Netz nach Abzug des Kraftwerkseigenbedarfs, ohne industrielle Eigenversorgung.' },
  { title: 'Synchronzone', text: 'Das kontinentaleuropäische Verbundnetz reicht von Portugal bis in die Türkei. Ein Messgerät in Freiburg sieht (fast) dieselbe Frequenz wie eines in Warschau.' },
  { title: 'Netzzeit', text: 'Uhren, die mit der Netzfrequenz laufen, gehen bei Unterfrequenz nach. Die Abweichung wird über längere Phasen mit leicht erhöhter Frequenz wieder ausgeglichen.' },
  { title: 'Leistungsfaktor', text: 'cos φ = P / S. Bei cos φ = 0,8 fließen für dieselbe Wirkleistung 25 % mehr Strom als bei cos φ = 1 – die Verluste steigen mit dem Quadrat des Stroms.' },
];

/** Satirical "KPI of the day" definitions (deterministic per day). */
export const NONSENSE_KPIS: { label: string; unit: string; min: number; max: number; note: string }[] = [
  { label: 'Durchschnittliche Excel-Toleranz', unit: '%', min: 12, max: 97, note: 'Anteil der Ingenieure, die eine weitere Tabelle ohne Widerspruch akzeptieren.' },
  { label: 'Elektronen-Motivation', unit: '%', min: 35, max: 99, note: 'Gemessen am Drift der Ladungsträger. Also gar nicht.' },
  { label: 'Transformator-Zufriedenheit', unit: '/ 10', min: 4, max: 10, note: 'Hängt überraschend stark vom Ölstand ab.' },
  { label: 'Genehmigungsbehörden-Latenz', unit: 'Jahre', min: 2, max: 14, note: 'Round-Trip-Time eines Antrags, ohne Rückfragen.' },
  { label: 'Management-Entropie', unit: 'kJ/K', min: 1, max: 999, note: 'Nimmt in Meetings nie ab. Zweiter Hauptsatz.' },
  { label: 'Kaffeereserve der Leitwarte', unit: 'h', min: 1, max: 48, note: 'Primärreserve für Menschen.' },
  { label: 'PowerPoint-Folien bis zur Entscheidung', unit: 'Folien', min: 17, max: 184, note: 'Konvergiert erfahrungsgemäß nicht.' },
];
