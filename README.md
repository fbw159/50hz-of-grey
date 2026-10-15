# ⚡ 50 Hz of Grey

**The German Grid Crisis Simulator – Keeping the lights on. Against all odds.**

Eine satirische Netzleitwarte mit **echten Energiedaten**. Sieht aus wie ein sehr teures SCADA-System, redet wie ein Netzbetriebsingenieur nach dem achten Kaffee. Die Messwerte sind heilig – die Kommentare dürfen komplett bescheuert sein.

> Live: **https://fbw159.github.io/50hz-of-grey/**

![50 Hz of Grey](public/icons/og-image.png)

## Was das Ding kann

| Bereich | Inhalt |
| --- | --- |
| **Leitwarte** | Netzfrequenz (Sekundenmessung, Fraunhofer ISE Freiburg), Day-Ahead-Preis, EE-Anteil an der Last, PV, Wind, Bürokratie-Index (Satire), **Grid Panic Index™** (Satire mit nachvollziehbarer Formel), Alarmjournal *Grid Incident Reports*, Erzeugungsmix der letzten 24 h, Dunkelflaute DEFCON, Ingenieur-Fakten, Quatsch-KPI des Tages |
| **Strombörse – Merit Order of Madness** | Day-Ahead-Preise DE-LU in echter 15-Minuten-Auflösung, gestern/heute/morgen, Min/Max/Ø, negative Preisintervalle inkl. Dauer, Negative-Price-Party 🎉, Strompreis-Orakel (satirische Managementempfehlungen), interaktives Merit-Order-Lehrmodell |
| **Erzeugung – Generation Circus** | Öffentliche Nettoerzeugung nach Energieträgern, Tagesverlauf, Tagesvergleich (GWh), Prognose vs. Ist für PV und Wind, Dunkelflaute DEFCON mit erklärter Heuristik |
| **Labor – Engineering Disaster Lab** | *Frequency Anxiety Monitor* (echte Messung, Zeitfenster, Downsampling mit Extremwerterhalt), *Grid Chaos Engine* (Swing-Gleichung, RK4, Primärregelung), *Reactive Power Enforcement Agency* (Blindleistungsrechner mit Leistungsdreieck und fiktivem Bußgeldbescheid), *Redispatch-Generator 3000* (DC-Lastfluss mit vier Knoten), **DO NOT PRESS** |
| **Management Mode™** | Less engineering. More PowerPoint. Übergangsanimation, absurde Management-KPIs, „Mehr Grün in den Charts“, Krisenmeeting mit kopierbarem Protokoll – die echten Werte bleiben unverändert |
| **Mehr** | Einstellungen (Light/Dark, Retro-SCADA, Humor-Intensität, Demo-Modus, Animationen, reduzierte Bewegung, Sounds), Achievements, Spielwiese (Excel-Knopf, Meeting-Simulator, Ausreden-Generator), Datenstatus, Ingenieur-Wissen, Datenschutz |
| **Extras** | Mobile-first mit Bottom-Navigation und Safe Areas, Daily-Grid-Report zum Teilen (Web Share API, PNG-Export), PWA-Manifest + Service Worker, Konami-Code, Easter Eggs, Intro-Sequenz beim ersten Besuch |

## Technologie

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Recharts 3 · Motion · Lucide Icons · Vitest · Playwright · GitHub Actions · GitHub Pages

Keine Backend-Server, keine Konten, keine Tracker, keine API-Keys, keine kostenpflichtigen Dienste. Schriften (Space Grotesk, Inter, JetBrains Mono) liegen lokal in der App.

## Echte Datenquellen

Alle Messwerte stammen von **[Energy-Charts](https://www.energy-charts.info/)** (Fraunhofer-Institut für Solare Energiesysteme ISE), API v2 (`https://api.energy-charts.info/`):

| Endpunkt | Verwendung |
| --- | --- |
| `/v2/price` (bzn=DE-LU) | Day-Ahead-Großhandelspreise gestern/heute/morgen, 15-Minuten-Intervalle |
| `/v2/public_power` (country=de) | Öffentliche Nettostromerzeugung nach Energieträgern, Last, Residuallast, EE-Anteile (3 Tage) |
| `/v2/frequency` (region=DE-Freiburg) | Netzfrequenz der Synchronzone Kontinentaleuropa, 1 s Auflösung, letzte 60 min |
| `/v2/signal` | Stromampel / prognostizierter EE-Anteil an der Last |
| `/v2/public_power_forecast` | Day-Ahead-Prognosen für PV, Wind Onshore/Offshore und Last |
| `/v2/installed_power` (monthly) | Installierte Leistung (für Kapazitätsfaktoren / DEFCON) |

Lizenz der Daten: **CC BY 4.0**, Namensnennung energy-charts.info; Day-Ahead-Preise: Bundesnetzagentur | SMARD.de (CC BY 4.0). Die Lizenzangabe jedes Datensatzes wird mitgespeichert und in der App angezeigt.

### Satirische Kennzahlen – bitte nicht ernst nehmen

Grid Panic Index™, Bürokratie-Index, DEFCON-Stufen, Management-KPIs, Quatsch-KPI, Frequency Excellence Score und alle mit **Satire** markierten Meldungen sind erfunden. Sie sind **keine** Bewertung der Netzsicherheit. Die DEFCON-Heuristik (Kapazitätsfaktor Wind + PV und dessen Dauer) ist selbst definiert und in der App erklärt. Echte Werte werden niemals verändert, dramatisiert oder durch erfundene ersetzt – fehlende Daten werden als fehlend angezeigt.

## Datenarchitektur: Snapshot statt Live-Request

Die Energy-Charts-API sendet **keine CORS-Header** für fremde Origins, Browser auf GitHub Pages können sie also nicht direkt abfragen. Außerdem ist sie rate-limitiert (standardmäßig 2 Requests/Minute, `/price` 2/min mit Burst 2). Deshalb:

1. **GitHub Actions** führt alle 10 Minuten (und bei jedem Push) `scripts/update-data.mjs` aus. Das Skript holt die Daten mit Rate-Limit-Pacing, beachtet HTTP 429 + `Retry-After`, validiert die Antworten und schreibt einen kompakten Snapshot nach `public/data/latest.json` (Datenquellen, Messzeitstempel, Abrufzeit, Lizenz, Fehlermetadaten).
2. Die Seite wird mit dem Snapshot neu gebaut und auf GitHub Pages veröffentlicht. Es wird **nichts committet** – der Snapshot lebt nur im Deployment.
3. Der Client lädt den Snapshot, zeigt den Datenstand überall mit Zeitstempel an, speichert die letzten gültigen Daten im Browser (localStorage) und markiert veraltete Daten deutlich.
4. **Direkter API-Modus:** In `npm run dev` proxyt Vite `/api/energy-charts` zur echten API, der Client lädt dann live (mit Request-Deduplizierung, Cache, Token-Bucket wie die Serverlimits, Backoff). Wer einen eigenen CORS-Proxy betreibt, setzt `VITE_API_BASE_URL` (siehe `.env.example`), dann nutzt auch der Production-Build bevorzugt frische API-Daten und fällt bei Problemen auf den Snapshot zurück.
5. **Demo-Modus:** Plausible, deterministische Beispieldaten – überall als *DEMO – SIMULIERTE DATEN* gekennzeichnet. Wird nur aktiviert, wenn man ihn in den Einstellungen einschaltet; die App schaltet nie unbemerkt auf Demo-Werte um. Bei Ausfall aller Quellen erscheint „Keine aktuellen Daten“ mit dem letzten gültigen Datensatz.

Hinweis: GitHub führt geplante Workflows **verzögert** aus (vor allem zur vollen Stunde) und deaktiviert sie nach 60 Tagen ohne Repository-Aktivität. Ein `workflow_dispatch` oder Push reaktiviert sie.

## Lokal starten

Voraussetzung: Node.js ≥ 20.19 (empfohlen 22).

```bash
npm install
npm run dev        # http://localhost:5173/50hz-of-grey/  (live über Vite-Proxy)
npm run build      # Typecheck + Production-Build nach dist/
npm run preview    # Production-Build lokal unter http://localhost:4173/50hz-of-grey/
```

Weitere Befehle:

```bash
npm run update-data   # Snapshot public/data/latest.json von der API holen (dauert ~2–3 min wegen Rate-Limits)
npm test              # Unit-Tests (Vitest)
npm run test:e2e      # Browser-Smoke-Tests (Playwright; vorher npm run build)
npm run lint          # ESLint
npm run typecheck     # tsc
node scripts/generate-icons.mjs   # PWA-Icons und OG-Bild neu rendern
```

Der im Repository eingecheckte Snapshot ist ein Stand vom Zeitpunkt des letzten Commits. `npm run preview` zeigt daher ältere Daten (mit entsprechendem Zeitstempel), bis `npm run update-data` gelaufen ist. Im Dev-Server kommen die Daten live über den Proxy.

## Deployment auf GitHub Pages (Schritt für Schritt)

1. **Repository anlegen** – auf GitHub ein neues Repository `50hz-of-grey` erstellen (öffentlich, damit Pages und Actions kostenlos sind).
2. **Code hochladen:**
   ```bash
   git init -b main
   git add .
   git commit -m "feat: unleash grid chaos"
   git remote add origin https://github.com/DEIN-NAME/50hz-of-grey.git
   git push -u origin main
   ```
3. **GitHub Pages aktivieren:** Repository → *Settings* → *Pages* → unter **Build and deployment** bei *Source* **GitHub Actions** auswählen (keinen `gh-pages`-Branch anlegen, das ist nicht nötig).
4. **Workflow laufen lassen:** Der Push auf `main` startet *Build & Deploy to GitHub Pages* automatisch (Tab *Actions*). Alternativ dort über *Run workflow* manuell starten.
5. **Link öffnen:** `https://DEIN-NAME.github.io/50hz-of-grey/` – steht auch im Workflow-Lauf unter dem Job *deploy*.

### Anderer Repository-Name?

Der Basis-Pfad wird im Workflow **automatisch** aus dem Repository-Namen abgeleitet (`/<repo>/`, bei `name.github.io` → `/`). Für lokale Builds unter anderem Namen gibt es zwei Stellen:

- `vite.config.ts` → Fallback `const basePath = process.env.BASE_PATH ?? '/50hz-of-grey/'`
- oder Umgebungsvariable `BASE_PATH=/mein-name/ npm run build`

Alle Asset-Pfade werden relativ zu `import.meta.env.BASE_URL` aufgelöst; Navigation per Hash-Routing (`#/market`), damit das Neuladen einer Unterseite auf Pages keinen 404 erzeugt.

## API-Rate-Limits

Die öffentliche API erlaubt standardmäßig **2 Requests pro Minute (Burst 4)** je Client-IP, `/price` 2/min (Burst 2), `/signal` 20/min; die Limits werden lastabhängig angepasst. Das Snapshot-Skript und der Live-Client halten sich daran (Token-Bucket, serialisierte Requests, Warten statt Verwerfen), respektieren HTTP 429 samt `Retry-After` und cachen Antworten. Bitte das Intervall des Cron-Jobs nicht wesentlich verkürzen.

## Tests

- **Unit (Vitest, 90+ Tests):** MW/GW- und EUR/MWh→ct/kWh-Umrechnung, Preisauswertung und negative Intervalle, 23/25-Stunden-Tage, Zeitzonen, Frequenzabweichung und Downsampling, Panikindex, Blindleistung, Swing-Gleichung (Anfangssteigung, stationärer Zustand, Stabilität), DC-Lastfluss, API-Response-Verarbeitung, Rate-Limit-Budget, 429/404-Behandlung, Cache- und Fallback-Logik, Humor-Engine, Alarmjournal. Der Wert 0 wird überall als gültiger Messwert behandelt.
- **Browser (Playwright):** Smartphone-Layouts (Pixel 7, iPhone SE, 320–1440 px ohne horizontalen Überlauf), Navigation und Reload von Unterseiten unter dem Pages-Pfad, Diagramme, Simulator-Slider und -Buttons, Management-Modus, Demo-Modus, Easter Eggs, Einstellungs-Persistenz, Fehlerzustände (fehlender Snapshot), Konsolenfehler.

Die Tests wurden lokal in Chromium ausgeführt; WebKit/Safari wurde nicht automatisiert getestet (die iPhone-Profile laufen in Chromium mit entsprechender Viewport-/Touch-Emulation).

## Projektstruktur

```
.github/workflows/   deploy.yml (Build + Daten-Snapshot + Pages-Deploy), ci.yml (Lint, Tests)
public/              favicon, manifest.webmanifest, sw.js, icons/, data/latest.json (Snapshot)
scripts/             update-data.mjs (Snapshot-Updater), generate-icons.mjs
src/
  components/        layout/, navigation/, ui/, charts/, cards/, animations/
  pages/             ControlRoom, Market, Generation, EngineeringLab, More
  features/          frequency/, prices/, production/, dunkelflaute/, panic/, incidents/,
                     simulations/, achievements/, management/, easterEggs/, share/, settings/
  services/          energyChartsApi.ts, dataAdapters.ts, dataCache.ts, dataSource.ts, snapshotLoader.ts
  lib/               humorEngine.ts, engineeringMath.ts, formatters.ts, dateUtils.ts, timeseries.ts, …
  data/              jokes.ts (Humor-Datenbank), demoData.ts, achievements.ts
  types/             energyCharts.ts (API), data.ts (normalisiert), snapshot.ts
tests/e2e/           Playwright-Smoke-Tests
```

## Datenschutz

Keine Cookies, kein Tracking, keine Konten. Lokal gespeichert werden Einstellungen, Achievements, der letzte Daten-Cache und der Intro-Hinweis (localStorage). Externe Aufrufe im veröffentlichten Zustand: nur GitHub Pages (Hosting) – Details in der App unter *Mehr → Datenschutz*.

## Mögliche Erweiterungen

- Grenzüberschreitender Handel und physikalische Flüsse (`/v2/cbet`, `/v2/cbpf`) als „Import/Export-Drama“
- Historische Extremwerte der Frequenz (seriös aus längeren Zeitreihen berechnet)
- Weitere Gebotszonen/Länder (mit Beachtung der jeweiligen Datenlizenzen)
- Intraday-Prognosen und Prognosefehler-Statistik
- Eigener CORS-Proxy (z. B. Cloudflare Worker) für echte Live-Daten im Browser
- Mehr Easter Eggs. Es gibt nie genug Easter Eggs.

## Lizenzen und Attribution

Code: MIT (siehe `LICENSE`). Daten: Energy-Charts / Fraunhofer ISE (CC BY 4.0), Day-Ahead-Preise Bundesnetzagentur | SMARD.de (CC BY 4.0). Schriften: Space Grotesk, Inter, JetBrains Mono (OFL). Icons: Lucide (ISC).

*Satire. Keine Netzsicherheitsbewertung. Bitte keine Redispatch-Maßnahmen auf Basis dieser App einleiten.*
