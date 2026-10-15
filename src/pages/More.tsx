import type { ReactNode } from 'react';
import { ChevronRight, Settings, Trophy, Database, ShieldCheck, Info, Gamepad2, Github, BookOpen } from 'lucide-react';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { DataStatusPanel } from '@/components/layout/DataStatus';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { AchievementsPanel } from '@/features/achievements/AchievementsPanel';
import { ExcelButton, ExcuseGenerator, MeetingSimulator } from '@/features/easterEggs/EasterEggs';
import type { RouteId } from '@/hooks/useHashRoute';
import { routeHref } from '@/hooks/useHashRoute';
import { ENGINEER_FACTS } from '@/data/jokes';

interface Props {
  sub: string | null;
  onNavigate: (page: RouteId, sub?: string | null) => void;
}

const SECTIONS: { id: string; label: string; description: string; icon: typeof Settings }[] = [
  { id: 'settings', label: 'Einstellungen', description: 'Theme, Retro-SCADA, Management-Modus, Humor-Intensität, Demo-Daten', icon: Settings },
  { id: 'achievements', label: 'Achievements', description: 'Lokal gespeicherte Auszeichnungen fragwürdiger Kompetenz', icon: Trophy },
  { id: 'playground', label: 'Spielwiese', description: 'Excel, Meeting-Simulator, Ausreden-Generator', icon: Gamepad2 },
  { id: 'data', label: 'Datenquellen & Status', description: 'Woher die Zahlen kommen und wie alt sie sind', icon: Database },
  { id: 'glossary', label: 'Ingenieur-Wissen', description: 'Kurze, korrekte Erklärungen zu Netz und Markt', icon: BookOpen },
  { id: 'privacy', label: 'Datenschutz', description: 'Welche externen Aufrufe es gibt und was lokal gespeichert wird', icon: ShieldCheck },
  { id: 'about', label: 'Über 50 Hz of Grey', description: 'Satire, Lizenzen, Quellcode', icon: Info },
];

const REPO_URL = 'https://github.com/fbw159/50hz-of-grey';

export default function More({ sub, onNavigate }: Props) {
  const section = SECTIONS.find((s) => s.id === sub)?.id ?? null;
  if (!section) {
    return (
      <div className="space-y-4">
        <SectionTitle title="Mehr" subtitle="Einstellungen, Achievements, Datenquellen und das Kleingedruckte" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <a
                  href={routeHref('more', s.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('more', s.id);
                  }}
                  className="card flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
                  data-testid={`more-${s.id}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-cyan">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text">{s.label}</span>
                    <span className="block truncate text-xs text-text-2">{s.description}</span>
                  </span>
                  <ChevronRight size={16} className="text-text-3" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
        <p className="text-center font-mono text-[10px] text-text-3">
          50 Hz of Grey v{__APP_VERSION__} ·{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
            GitHub
          </a>
        </p>
      </div>
    );
  }

  const meta = SECTIONS.find((s) => s.id === section)!;
  return (
    <div className="space-y-4">
      <SectionTitle
        title={meta.label}
        subtitle={meta.description}
        right={
          <a href={routeHref('more')} onClick={(e) => { e.preventDefault(); onNavigate('more'); }} className="btn btn-ghost btn-sm">
            Übersicht
          </a>
        }
      />
      {section === 'settings' && <SettingsPanel />}
      {section === 'achievements' && <AchievementsPanel />}
      {section === 'playground' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ExcelButton />
          <MeetingSimulator />
          <div className="lg:col-span-2">
            <ExcuseGenerator />
          </div>
        </div>
      )}
      {section === 'data' && (
        <div className="space-y-3">
          <Card>
            <CardHeader title="Datenstatus" />
            <div className="mt-3">
              <DataStatusPanel />
            </div>
          </Card>
          <Card>
            <CardHeader title="Datenquellen" />
            <div className="mt-3 space-y-3 text-sm text-text-2">
              <p>
                <strong className="text-text">Energy-Charts (Fraunhofer-Institut für Solare Energiesysteme ISE)</strong> – API v2, <ExtLink href="https://api.energy-charts.info/">api.energy-charts.info</ExtLink>. Daten: Day-Ahead-Preise (DE-LU, Quelle Bundesnetzagentur | SMARD.de), öffentliche Nettostromerzeugung nach Energieträgern, Last, Netzfrequenz (Messung Freiburg, Synchronzone Kontinentaleuropa), Day-Ahead-Prognosen für PV, Wind und Last, Stromampel/EE-Anteil, installierte Leistung.
              </p>
              <p>Lizenz: CC BY 4.0 mit Namensnennung energy-charts.info, Day-Ahead-Preise CC BY 4.0 von Bundesnetzagentur | SMARD.de. Die jeweilige Lizenzangabe wird mit jedem Datensatz gespeichert und in der App angezeigt.</p>
              <p>
                <strong className="text-text">Aktualisierung:</strong> Die API erlaubt keine direkten Browserzugriffe von fremden Domains (CORS) und ist rate-limitiert (meist 2 Anfragen/Minute). Deshalb holt ein GitHub-Actions-Workflow die Daten regelmäßig ab, speichert sie als Snapshot und veröffentlicht die Seite neu. Der Datenstand ist überall mit Zeitstempel ausgewiesen; veraltete Daten werden als solche markiert, niemals geschätzt.
              </p>
              <p>
                <strong className="text-text">Satire:</strong> Grid Panic Index™, Bürokratie-Index, DEFCON-Stufen, Management-KPIs, Quatsch-KPI und alle Meldungen mit Satire-Kennzeichnung sind erfunden und keine Netzzustandsbewertung.
              </p>
            </div>
          </Card>
        </div>
      )}
      {section === 'glossary' && (
        <Card>
          <CardHeader title="Ingenieur-Wissen" subtitle="Kurze Erklärungen, die auch ohne Lehrstuhl funktionieren" />
          <dl className="mt-3 divide-y divide-border">
            {ENGINEER_FACTS.map((f) => (
              <div key={f.title} className="py-3">
                <dt className="text-sm font-medium text-text">{f.title}</dt>
                <dd className="mt-0.5 text-sm text-text-2">{f.text}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      {section === 'privacy' && (
        <Card>
          <CardHeader title="Datenschutzhinweis" subtitle="Kurz, ehrlich, ohne Versprechen, die wir nicht halten können" />
          <div className="mt-3 space-y-3 text-sm text-text-2">
            <p>
              <strong className="text-text">Hosting:</strong> Diese Seite wird als statische Website über GitHub Pages ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Verbindungsdaten (z. B. IP-Adresse) nach den Datenschutzbestimmungen von GitHub. Darauf haben wir keinen Einfluss.
            </p>
            <p>
              <strong className="text-text">Externe Datenabrufe:</strong> Im veröffentlichten Zustand lädt der Browser nur Dateien von dieser Website (inklusive des Daten-Snapshots <code>data/latest.json</code>). Direkte Anfragen an api.energy-charts.info aus dem Browser finden nur statt, wenn die App ausdrücklich mit einer API-Basis-URL gebaut wurde (z. B. lokal in der Entwicklung über den Vite-Proxy).
            </p>
            <p>
              <strong className="text-text">Schriften:</strong> Die Schriftarten liegen lokal in der App. Es werden keine Font-Dienste Dritter aufgerufen.
            </p>
            <p>
              <strong className="text-text">Lokale Speicherung (localStorage):</strong> Einstellungen (Theme, Humor-Intensität, Modi), Achievements und Zähler, ein Zwischenspeicher der zuletzt geladenen Daten sowie der Hinweis, dass das Intro gezeigt wurde. Diese Daten verlassen den Browser nicht und können in den Einstellungen oder über die Browser-Funktionen gelöscht werden.
            </p>
            <p>
              <strong className="text-text">Kein Tracking:</strong> Keine Analyse-Tools, keine Cookies, keine Konten, keine Weitergabe von Daten. Die Web-Share-Funktion übergibt Text nur an die vom Nutzer gewählte App.
            </p>
            <p>
              <strong className="text-text">Service Worker:</strong> Ein optionaler Service Worker speichert App-Dateien für den Offline-Betrieb zwischen. Daten werden netzwerkbevorzugt geladen; offline angezeigte Daten sind als veraltet gekennzeichnet.
            </p>
          </div>
        </Card>
      )}
      {section === 'about' && (
        <Card>
          <CardHeader title="⚡ 50 Hz of Grey" subtitle="The German Grid Crisis Simulator – Keeping the lights on. Against all odds." />
          <div className="mt-3 space-y-3 text-sm text-text-2">
            <p>Eine satirische Netzleitwarte mit echten Energiedaten. Die Messwerte sind heilig, die Kommentare dürfen komplett bescheuert sein. Für alle, die Begriffe wie Redispatch, Blindleistung, Dunkelflaute, Merit Order und cos φ kennen – und für alle, die sie hier kennenlernen.</p>
            <p>
              Quellcode, Deployment-Anleitung und Issues: <ExtLink href={REPO_URL}><Github size={14} className="mr-1 inline" aria-hidden="true" />github.com/fbw159/50hz-of-grey</ExtLink>
            </p>
            <p>Daten: Energy-Charts (Fraunhofer ISE), CC BY 4.0. Day-Ahead-Preise: Bundesnetzagentur | SMARD.de, CC BY 4.0. Icons: Lucide (ISC). Schriften: Space Grotesk, Inter, JetBrains Mono (OFL). App-Code: MIT.</p>
            <p className="text-[11px] text-text-3">Version {__APP_VERSION__}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
      {children}
    </a>
  );
}
