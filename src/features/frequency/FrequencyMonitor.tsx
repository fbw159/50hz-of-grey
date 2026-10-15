import { useEffect, useMemo, useState } from 'react';
import { Waves, Target } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { OriginTag } from '@/components/ui/Tags';
import { NumberTicker } from '@/components/animations/NumberTicker';
import { FrequencyChart } from '@/components/charts/FrequencyChart';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { showSnack } from '@/hooks/useSnackbar';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';
import { achievementStore } from '@/features/achievements/achievementStore';
import { formatAge, formatBerlinDateTime, formatBerlinTime } from '@/lib/dateUtils';
import { formatHz, formatMilliHz, formatNumber } from '@/lib/formatters';
import { availableWindows, getFrequencyStatus, getFrequencyWindow } from './frequencyMetrics';

export function FrequencyMonitor() {
  const data = useGridData();
  const now = useNow(1000);
  const settings = useSettings();
  const ds = data.datasets.frequency;
  const status = useMemo(() => getFrequencyStatus(ds, now), [ds, now]);
  const [windowMin, setWindowMin] = useState(15);
  const { windows, effectiveWindow, win } = useMemo(() => {
    const available = availableWindows(ds);
    const effective = available.includes(windowMin) ? windowMin : available[available.length - 1];
    return { windows: available, effectiveWindow: effective, win: getFrequencyWindow(ds, effective, 600) };
  }, [ds, windowMin]);
  const [perfectionism, setPerfectionism] = useState(false);
  const [calming, setCalming] = useState(false);

  // "watched longer than socially acceptable" – 60 s on this view
  useEffect(() => {
    const t = setTimeout(() => achievementStore.track('frequency-watched'), 60_000);
    return () => clearTimeout(t);
  }, []);

  const deviation = status?.deviationHz ?? 0;
  const barPos = Math.max(-1, Math.min(1, deviation / 0.1)); // ±100 mHz full scale

  const calm = () => {
    setCalming(true);
    showSnack('Die Schwungmassen wurden freundlich angesprochen. Messwerte unverändert.', { tone: 'info' });
    setTimeout(() => setCalming(false), 2500);
  };

  return (
    <div className="space-y-3" data-testid="frequency-monitor">
      <Card elevated glow>
        <CardHeader
          title="Frequency Anxiety Monitor"
          subtitle="50 Hz. More or less."
          right={
            <>
              {status && <OriginTag origin={status.origin} />}
              <InfoButton title="Netzfrequenz – Einordnung">
                <p>Gemessen wird die Frequenz der Synchronzone Kontinentaleuropa am Fraunhofer ISE in Freiburg (Energy-Charts), mit einem Messwert pro Sekunde. Die Anzeige verwendet ausschließlich echte Messwerte; beim Verdichten für das Diagramm bleiben Minima und Maxima erhalten.</p>
                <p>Die Netzfrequenz ist nie exakt konstant 50,000 Hz. Abweichungen von einigen zehn mHz sind Normalbetrieb. Der grüne Bereich (±50 mHz) dient nur der Orientierung und ist keine offizielle Warnstufe.</p>
                <p>Ist der Wert älter als 20 Minuten, wird er als veraltet gekennzeichnet – er wird nie geschätzt oder fortgeschrieben.</p>
              </InfoButton>
            </>
          }
        />
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={`glow-text text-[3.25rem] font-bold leading-none sm:text-7xl ${status?.stale ? 'text-amber' : 'text-text'} ${perfectionism && settings.humor !== 'professional' ? 'glitch' : ''}`} data-text={status ? formatNumber(status.value, 3, 3) : ''} data-testid="monitor-value">
              <NumberTicker value={status?.value ?? null} format={(v) => formatNumber(v, 3, 3)} durationMs={400} />
              <span className="ml-2 text-2xl font-medium text-text-3">Hz</span>
            </div>
            <div className="readout mt-3 text-base text-text-2">
              Abweichung <span className={Math.abs(deviation) > 0.05 ? 'text-amber' : 'text-text'}>{status ? formatMilliHz(status.deviationHz, 1) : '–'}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-text-3" data-testid="monitor-meta">
              {status ? `Messung ${formatBerlinDateTime(status.t, true)} Uhr · ${formatAge(status.ageMs)} · ${status.region} · ${status.synchronousArea}` : 'Keine Messung geladen'}
            </div>
            {status?.stale && <div className="mt-1 text-xs text-amber">Veraltet – letzter verfügbarer Messwert.</div>}
            {status?.isPerfect && <div className="mt-2 font-display text-sm font-bold text-green">PERFEKTION ERREICHT. INGENIEURE WEINEN VOR GLÜCK.</div>}
          </div>
          <div className="w-full md:w-72">
            <div className="label-caps mb-1 flex justify-between">
              <span>−100 mHz</span>
              <span>50,000</span>
              <span>+100 mHz</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full border border-border bg-bg-deep/60" aria-hidden="true">
              <div className="absolute inset-y-0 left-1/4 right-1/4 bg-green/15" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <div className={`absolute top-0 h-full w-1.5 rounded-full bg-cyan ${animationsEnabled(settings) ? 'transition-[left] duration-700' : ''}`} style={{ left: `calc(50% + ${barPos * 50}% - 3px)`, boxShadow: '0 0 10px var(--c-glow)' }} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Verlauf" subtitle={win ? `${win.windowMinutes} Minuten bis zur neuesten Messung · ${win.count} Messwerte, ${win.samples.length} dargestellt` : 'Kein Verlauf'} />
        <div className="scroll-x mt-3 flex gap-1" role="tablist" aria-label="Zeitfenster">
          {windows.map((w) => (
            <button key={w} type="button" role="tab" aria-selected={effectiveWindow === w} className="chip" onClick={() => setWindowMin(w)} data-testid={`window-${w}`}>
              {w} min
            </button>
          ))}
        </div>
        <div className={`mt-3 -ml-2 ${calming && animationsEnabled(settings) ? 'animate-pulse' : ''}`}>
          <FrequencyChart samples={win?.samples ?? []} height={240} moreGreen={settings.moreGreen} />
        </div>
        {win && (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">Minimum</dt>
              <dd className="readout text-text">{formatHz(win.min, 3)}</dd>
              <dd className="text-[11px] text-text-3">{win.minT ? `${formatBerlinTime(win.minT, true)}` : ''}</dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">Maximum</dt>
              <dd className="readout text-text">{formatHz(win.max, 3)}</dd>
              <dd className="text-[11px] text-text-3">{win.maxT ? `${formatBerlinTime(win.maxT, true)}` : ''}</dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">Mittelwert</dt>
              <dd className="readout text-text">{formatHz(win.avg, 3)}</dd>
              <dd className="text-[11px] text-text-3">Spanne {win.min !== null && win.max !== null ? formatMilliHz(win.max - win.min, 0).replace('+', '') : '–'}</dd>
            </div>
          </dl>
        )}
        {settings.humor !== 'professional' && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className={`btn flex-1 ${perfectionism ? 'btn-danger' : ''}`} onClick={() => setPerfectionism((p) => !p)} data-testid="perfectionism">
              <Target size={16} aria-hidden="true" /> 50-HZ-PERFEKTIONISMUS {perfectionism ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
            </button>
            <button type="button" className="btn flex-1" onClick={calm} data-testid="calm-masses">
              <Waves size={16} aria-hidden="true" /> SCHWUNGMASSEN BERUHIGEN
            </button>
          </div>
        )}
        {perfectionism && (
          <p className="mt-3 text-sm text-red" data-testid="perfectionism-warning">
            {Math.abs(deviation) < 0.005 ? 'Sollwert 50,000 Hz. Realität hat andere Pläne.' : 'WARNUNG: Ingenieur kann die Existenz von Nachkommastellen nicht akzeptieren.'}
          </p>
        )}
        <p className="mt-3 text-[11px] text-text-3">Quelle: Energy-Charts (Fraunhofer ISE), {ds?.license ?? 'CC BY 4.0'}. Buttons verändern keine Messwerte.</p>
      </Card>
    </div>
  );
}
