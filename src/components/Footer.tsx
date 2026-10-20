import { Github } from 'lucide-react';

const REPO_URL = 'https://github.com/fbw159/50hz-of-grey';

export function Footer() {
  return (
    <footer className="space-y-3 px-1 pb-10 pt-2 text-[0.875rem] text-ink-2">
      <p>
        <strong className="text-ink">Daten:</strong>{' '}
        <a className="underline" href="https://www.energy-charts.info" target="_blank" rel="noreferrer">
          Energy-Charts
        </a>{' '}
        vom Fraunhofer ISE, Lizenz CC BY 4.0. Die Seite holt sich die Werte regelmäßig neu, etwa alle 30 bis 45 Minuten.
      </p>
      <p>
        <strong className="text-ink">Achtung, Satire:</strong> Die Zahlen sind echt, die Anzüglichkeiten nicht ernst gemeint. Der Erregungs-Index ist eine Spaß-Kennzahl
        und keine offizielle Netzinformation. Mit dem bekannten Roman teilen wir nur den Grauton.
      </p>
      <p>
        <strong className="text-ink">Datenschutz:</strong> Keine Cookies, kein Tracking, keine externen Schriften. Dein Spielrekord bleibt nur in deinem Browser.
      </p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a className="inline-flex items-center gap-1.5 underline" href={REPO_URL} target="_blank" rel="noreferrer">
          <Github size={16} aria-hidden="true" />
          Quellcode auf GitHub
        </a>
        <span>Version {__APP_VERSION__}</span>
      </p>
    </footer>
  );
}
