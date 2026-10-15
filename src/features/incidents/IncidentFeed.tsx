import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, Radio } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { SatireTag } from '@/components/ui/Tags';
import { useNow } from '@/hooks/useNow';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';
import { formatBerlinTime, formatBerlinShortDate, isSameBerlinDay } from '@/lib/dateUtils';
import type { Incident } from './incidentEngine';

const SEVERITY_META = {
  info: { label: 'INFO', icon: Info, color: 'text-cyan', border: 'border-l-cyan' },
  success: { label: 'SUCCESS', icon: CheckCircle2, color: 'text-green', border: 'border-l-green' },
  warning: { label: 'WARNING', icon: AlertTriangle, color: 'text-amber', border: 'border-l-amber' },
  critical: { label: 'CRITICAL', icon: OctagonAlert, color: 'text-red', border: 'border-l-red' },
} as const;

/** Scrolling ticker of the latest entries (pauses on hover, static with reduced motion). */
export function IncidentTicker({ incidents }: { incidents: Incident[] }) {
  const settings = useSettings();
  const animate = animationsEnabled(settings);
  const items = incidents.slice(0, 8);
  if (items.length === 0) return null;
  const content = items.map((i) => (
    <span key={i.id} className="mx-6 inline-flex items-center gap-2 text-xs">
      <span className={`font-mono text-[10px] ${SEVERITY_META[i.severity].color}`}>{SEVERITY_META[i.severity].label}{i.isSatire ? ' · SATIRE' : ''}</span>
      <span className="text-text-2">{i.title}</span>
    </span>
  ));
  return (
    <div className="card overflow-hidden py-2" aria-label="Alarmticker" data-testid="incident-ticker">
      <div className="flex items-center">
        <span className="ml-3 mr-2 inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red">
          <Radio size={12} aria-hidden="true" /> Live
        </span>
        <div className="scroll-x min-w-0 flex-1">
          {animate ? (
            <div className="ticker-track" style={{ ['--ticker-duration' as string]: `${Math.max(30, items.length * 9)}s` }}>
              {content}
              {content.map((c, i) => (
                <span key={`dup-${i}`} aria-hidden="true">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex whitespace-nowrap">{content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IncidentList({ incidents, limit, title = 'Grid Incident Reports' }: { incidents: Incident[]; limit?: number; title?: string }) {
  const [selected, setSelected] = useState<Incident | null>(null);
  const now = useNow(60_000);
  const shown = limit ? incidents.slice(0, limit) : incidents;
  return (
    <Card padding="none" data-testid="incident-list">
      <CardHeader title={title} subtitle="Alarmjournal der Leitwarte – echte Trigger und markierte Satire" className="px-4 pt-4" right={<span className="font-mono text-[10px] text-text-3">{incidents.length} Einträge</span>} />
      <ul className="mt-3 divide-y divide-border">
        {shown.map((i) => {
          const meta = SEVERITY_META[i.severity];
          const Icon = meta.icon;
          return (
            <li key={i.id}>
              <button type="button" onClick={() => setSelected(i)} className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-elevated ${meta.border}`}>
                <Icon size={16} className={`mt-0.5 shrink-0 ${meta.color}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`font-mono text-[10px] tracking-[0.12em] ${meta.color}`}>{meta.label}</span>
                    <span className="font-mono text-[10px] text-text-3">{isSameBerlinDay(i.t, now) ? formatBerlinTime(i.t) : `${formatBerlinShortDate(i.t)} ${formatBerlinTime(i.t)}`}</span>
                    <span className="font-mono text-[10px] text-text-3">{i.category}</span>
                    {i.isSatire && <SatireTag />}
                  </span>
                  <span className="mt-0.5 block text-sm text-text">{i.title}</span>
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-text-3">Keine Meldungen. Verdächtig ruhig.</li>}
      </ul>
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''} size="sm">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-text-3">
              <span className={SEVERITY_META[selected.severity].color}>{SEVERITY_META[selected.severity].label}</span>
              <span>{formatBerlinShortDate(selected.t)} {formatBerlinTime(selected.t)}</span>
              <span>{selected.category}</span>
              {selected.isSatire && <SatireTag />}
            </div>
            <p className="text-text-2">{selected.explanation}</p>
          </div>
        )}
      </Sheet>
    </Card>
  );
}
