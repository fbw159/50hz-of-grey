# ⚡ 50 Hz of Grey

**Die Boulevard-Zeitung fürs Stromnetz.** Echte Messwerte, maßlos übertriebene Schlagzeilen – und darunter immer „Die Wahrheit“, fachlich sauber. Kommentiert von Mr. Grey (230), einer Steckdose mit Krawatte und Gefühlen.

👉 **Live:** https://fbw159.github.io/50hz-of-grey/

![Vorschau](public/icons/og-image.png)

## Was drin ist

Eine einzige Seite, gebaut fürs Handy:

- **Titelseite:** Aus den echten Werten wird eine Schlagzeile („Wer hat die 19 Millihertz geklaut?“, „Strom kostet weniger als nichts!“). Darunter Mr. Grey mit Zitat und die nüchterne Einordnung „Die Wahrheit: …“. Mr. Greys Augen folgen dem Finger, antippen erlaubt.
- **Erregungs-Index (0–100) und Weltuntergangsuhr:** Spaß-Index aus Frequenzabweichung, Börsenpreis und Flaute; die Uhr rechnet ihn in Minuten bis Mitternacht um. Satire, keine offizielle Kennzahl.
- **Eilmeldungs-Ticker** mit echten Werten und absurden Endzeit-Schlagzeilen.
- **Messgeräte:** Netzfrequenz, Börsenstrompreis, Öko-Anteil.
- **Not-Aus („Bloß nicht drücken“):** Blackout, Schwarzstart, Licht an – plus die echte Zahl, wie selten Stromausfälle sind.
- **Netz-TV:** Die echte Frequenzmessung der letzten zehn Minuten läuft Sekunde für Sekunde noch einmal ab. Mit „Auf Deutsch“ (die Abweichung als Landefehler auf dem Flug Hamburg–München) und dem Schuldigen-Finder („Eindeutig ein Wasserkocher in Lissabon“) samt echter Erklärung.
- **Was kostet der Spaß gerade?** Börsenpreis, Stundenbalken, Schleudergang-Tipp für die nächsten 24 Stunden und Preise für Waschladung, E-Auto-Akku und ein Jahr Kühlschrank.
- **Wer bringt das Netz gerade in Fahrt?** Strommix mit Sprüchen, dazu die Leistung in DeLorean-Zeitreisen (1,21 Gigawatt), PS, Heimtrainern und Wasserkochern.
- **Netz-Wetter:** echte Wind-, Solar- und Preisprognosen der nächsten Stunden als Wetterbericht.
- **Spiel „Halt die 50 Hz!“:** 45 Sekunden Leitwarte, Mr. Grey schwitzt mit.
- **Steckbrief:** Mr. Greys Dating-Profil („Wohnt in deiner Wand“), mit Weiter- und Einstecken-Knopf.
- **Bettgeflüster für Ingenieure:** kurze, echte Fakten zum Stromnetz.

## Woher die Zahlen kommen

Alle Messwerte stammen von [Energy-Charts](https://www.energy-charts.info) (Fraunhofer ISE), Lizenz CC BY 4.0:
Netzfrequenz (Sekundenwerte, gemessen in Freiburg), Day-Ahead-Preis DE-LU, öffentliche Nettostromerzeugung und installierte Leistung.

Die API erlaubt keine direkten Abrufe aus fremden Webseiten (CORS). Deshalb holt ein **GitHub-Actions-Workflow** die Daten regelmäßig ab
(`scripts/update-data.mjs`, im Takt der API-Limits), legt sie als `data/latest.json` neben die Seite und veröffentlicht neu.
GitHub startet geplante Läufe nicht exakt und drosselt häufige Zeitpläne stark (angefragt: alle 5 Minuten); in der Praxis kommen neue Werte meist alle zwei bis vier Stunden.
Jeder Lauf übernimmt zuerst den zuletzt veröffentlichten Snapshot: Schlägt ein Abruf fehl, bleiben die alten Werte (mit ihrer echten Uhrzeit) stehen.
Ein geplanter Lauf ganz ohne Daten veröffentlicht nichts. Weil GitHub geplante Workflows nach 60 Tagen ohne Repo-Aktivität abschaltet, schaltet sich der Workflow einmal täglich selbst wieder an.

Ehrlichkeitsregeln:

- Jeder Wert zeigt seine Uhrzeit. Erzeugungsdaten kommen bei Energy-Charts ca. 1–2 Stunden verzögert.
- Fehlen Daten, sagt die Seite das. **Beispieldaten** gibt es nur auf Knopfdruck und dann mit gelb-schwarzem Warnbanner.
- Die Sprüche sind Satire, die Zahlen nicht. Der Erregungs-Index ist keine offizielle Kennzahl.

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:5173/50hz-of-grey/ – im Dev-Modus mit Live-Daten über einen Proxy
npm run update-data  # echten Snapshot nach public/data/latest.json holen (dauert 2–3 Minuten)
npm run build        # Produktions-Build nach dist/
npm run preview      # Build ansehen
```

## Tests

```bash
npm test             # Unit-Tests (Vitest): Rechenlogik, Datenschicht, Spielphysik
npm run test:e2e     # Browser-Tests (Playwright) auf Handy- und Desktop-Größe
npm run lint
```

## Projektstruktur

```
src/
  App.tsx              die Seite
  components/          Titelseite, Steckdose, Messgeräte, Netz-TV, Karten, Spiel
  content/texts.ts     alle Sprüche und Fakten an einem Ort
  logic/               Schlagzeilen, Umrechnungen, Netz-Wetter, Erregungs-Index, Preise, Strommix, Frequenz, Spiel (alles getestet)
  services/            Datenabruf: Snapshot, Cache, Live-API (Dev)
  lib/                 Formatierung, Zeit (Europe/Berlin), Zeitreihen
scripts/
  update-data.mjs      holt die Daten (GitHub Actions)
  generate-icons.mjs   Icons und Vorschaubild
.github/workflows/
  deploy.yml           Daten holen, bauen, auf GitHub Pages veröffentlichen
  ci.yml               Lint, Unit- und Browser-Tests
```

## Veröffentlichen

Push auf `main` reicht. In den Repository-Einstellungen muss unter **Settings → Pages → Source** „GitHub Actions“ ausgewählt sein.
Heißt das Repository anders, wird der Pfad automatisch aus dem Repo-Namen gesetzt.

## Datenschutz

Keine Cookies, kein Tracking, keine externen Schriften oder Skripte. Der Spielrekord liegt nur im eigenen Browser.

## Lizenzen

Code: MIT. Daten: Energy-Charts (Fraunhofer ISE), CC BY 4.0. Schriften: Barlow und Barlow Condensed (SIL OFL), DSEG7 von keshikan (SIL OFL). Icons: Lucide (ISC).
