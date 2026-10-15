import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { OriginTag, SatireTag } from '@/components/ui/Tags';
import { NumberTicker } from '@/components/animations/NumberTicker';
import { Sparkline } from '@/components/charts/Sparkline';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/features/settings/settingsStore';
import { formatAge, formatBerlinTime } from '@/lib/dateUtils';
import { formatHz, formatMilliHz, formatNumber } from '@/lib/formatters';
import { pickCaption, rotationSlot } from '@/lib/humorEngine';
import { getFrequencyStatus, getFrequencyWindow } from './frequencyMetrics';

interface Props {
  onOpenMonitor?: () => void;
}

export function FrequencyHero({ onOpenMonitor }: Props) {
  const data = useGridData();
  const now = useNow(1000);
  const settings = useSettings();
  const status = useMemo(() => getFrequencyStatus(data.datasets.frequency, now), [data.datasets.frequency, now]);
  const window5 = useMemo(() => getFrequencyWindow(data.datasets.frequency, 5, 160), [data.datasets.frequency]);
  const caption = pickCaption('frequency', 'frequencyNeutral', { seed: `freq-${rotationSlot(now, 10)}`, intensity: settings.humor });
  const tone = !status ? 'var(--c-text-3)' : status.stale ? 'var(--c-amber)' : 'var(--c-cyan)';

  return (
    <Card className="flex flex-col" elevated glow={!!status && !status.stale} data-testid="frequency-hero">
      <div className="flex items-start justify-between gap-2">
        <div>
          {settings.managementMode && <div className="font-display text-xs font-semibold text-purple">Frequency Excellence Score</div>}
          <div className="label-caps">Netzfrequenz</div>
        </div>
        <div className="flex items-center gap-1">
          {status && <OriginTag origin={status.origin} />}
          <InfoButton title="Warum schwankt die Netzfrequenz?">
            <p>Die Netzfrequenz zeigt das Gleichgewicht zwischen Erzeugung und Verbrauch im gesamten kontinentaleuropäischen Verbundnetz. Wird mehr verbraucht als erzeugt, sinkt sie leicht – und umgekehrt.</p>
            <p>Abweichungen von wenigen zehn Millihertz sind völlig normal. Die Primärregelung (FCR) reagiert innerhalb von Sekunden, die Sekundärregelung (aFRR) führt die Frequenz zurück auf 50 Hz.</p>
            <p><strong>Messung:</strong> Fraunhofer ISE, Freiburg (Energy-Charts), Sekundenauflösung. Angezeigt wird immer der letzte echte Messwert inklusive Datenalter – nichts wird geschätzt oder interpoliert.</p>
          </InfoButton>
        </div>
      </div>
      <div className="mt-3">
        <div className={`glow-text text-[2.75rem] font-bold leading-none sm:text-6xl ${status?.stale ? 'text-amber' : 'text-text'}`} data-testid="frequency-value">
          <NumberTicker value={status?.value ?? null} format={(v) => formatNumber(v, 3, 3)} durationMs={500} />
          <span className="ml-1 text-xl font-medium text-text-3 sm:text-2xl">Hz</span>
        </div>
        <div className="readout mt-2 flex flex-wrap gap-x-3 text-sm text-text-2" data-testid="frequency-deviation">
          <span>Abweichung {status ? formatMilliHz(status.deviationHz) : '–'}</span>
          {window5 && window5.min !== null && window5.max !== null && (
            <span className="text-text-3">
              5 min: {formatHz(window5.min)} … {formatHz(window5.max)}
            </span>
          )}
        </div>
      </div>
      {window5 && window5.samples.length > 1 && (
        <button type="button" onClick={onOpenMonitor} className="mt-3 block w-full rounded-lg" aria-label="Frequency Anxiety Monitor öffnen">
          <Sparkline points={window5.samples} width={600} height={72} stroke={tone} reference={50} ariaLabel="Frequenzverlauf der letzten 5 Minuten" className="h-[72px] w-full" />
        </button>
      )}
      {settings.managementMode && status && (
        <div className="mt-2 flex items-center gap-2 text-sm text-purple">
          <SatireTag />
          Frequency Excellence Score: {formatNumber(100 - Math.abs(status.deviationMilliHz) / 10, 2)} %
        </div>
      )}
      {status?.isPerfect && (
        <div className="glitch mt-2 font-display text-sm font-bold text-green" data-text="PERFEKTION ERREICHT. INGENIEURE WEINEN VOR GLÜCK." data-testid="perfect-frequency">
          PERFEKTION ERREICHT. INGENIEURE WEINEN VOR GLÜCK.
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-text-2">{caption?.title ?? 'Netzfrequenz'}</p>
        <p className="font-mono text-[10px] text-text-3" data-testid="frequency-meta">
          {status ? `${status.region} · ${status.synchronousArea} · ${formatBerlinTime(status.t, true)} Uhr · ${formatAge(status.ageMs)}` : 'Keine Frequenzmessung geladen'}
        </p>
      </div>
      {status?.stale && <p className="mt-1 text-xs text-amber">Messwert veraltet ({formatAge(status.ageMs)}) – letzter verfügbarer Datensatz.</p>}
    </Card>
  );
}
