import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CloudOff, Sun, Wind } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { SatireTag, OriginTag } from '@/components/ui/Tags';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisStyle, CATEGORY_COLORS, CHART_MARGIN, tooltipWrapperStyle } from '@/components/charts/chartTheme';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';
import { formatAge, formatBerlinTime } from '@/lib/dateUtils';
import { formatGw, formatNumber, formatPercent, formatPower } from '@/lib/formatters';
import { DEFCON_TEXT, getDefconStatus, type DefconLevel } from './defcon';

const LEVEL_COLOR: Record<DefconLevel, string> = {
  5: 'var(--c-green)',
  4: 'var(--c-cyan)',
  3: 'var(--c-amber)',
  2: 'var(--c-amber)',
  1: 'var(--c-red)',
};

interface Props {
  compact?: boolean;
}

export function DefconMonitor({ compact = false }: Props) {
  const data = useGridData();
  const now = useNow(60_000);
  const settings = useSettings();
  const status = useMemo(() => getDefconStatus(data.datasets.publicPower, data.datasets.installedPower, now, compact ? 12 : 24), [data.datasets.publicPower, data.datasets.installedPower, now, compact]);
  const rows = useMemo(() => status?.samples.map((s) => ({ t: s.t, wind: s.windMw, solar: s.solarMw, cf: s.cf })) ?? [], [status]);

  if (!status) {
    return (
      <Card>
        <CardHeader title="DUNKELFLAUTE DEFCON" subtitle="Keine Erzeugungsdaten geladen." right={<SatireTag />} />
      </Card>
    );
  }
  const text = DEFCON_TEXT[status.level];
  const color = LEVEL_COLOR[status.level];
  const th = status.thresholds;

  return (
    <Card data-testid="defcon-monitor">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CloudOff size={16} style={{ color }} aria-hidden="true" /> DUNKELFLAUTE DEFCON
          </span>
        }
        subtitle="Satirische Heuristik aus Wind- und Solareinspeisung relativ zur installierten Leistung"
        right={
          <>
            <SatireTag />
            <OriginTag origin={data.datasets.publicPower?.origin ?? 'snapshot'} />
            <InfoButton title="Wie funktioniert die DEFCON-Heuristik?">
              <p>Berechnet wird der Kapazitätsfaktor von Wind + PV: aktuelle Einspeisung geteilt durch die installierte Leistung (Energy-Charts, Monatswert). Stufen: ≥ {Math.round(th.level5 * 100)} % → DEFCON 5, ≥ {Math.round(th.level4 * 100)} % → 4, ≥ {Math.round(th.level3 * 100)} % → 3, ≥ {Math.round(th.level2 * 100)} % → 2, darunter 1.</p>
              <p>Dauer zählt: Liegt der Faktor seit mindestens {th.sustainedHours} h unter {Math.round(th.lowCf * 100)} %, wird um eine Stufe eskaliert – ein einzelner Messwert sagt nichts über eine Dunkelflaute aus.</p>
              <p><strong>Wichtig:</strong> Dies ist eine selbst definierte, satirische Klassifikation. Geringe Einspeisung ist kein Indikator für Netzinstabilität – die Residuallast wird von regelbaren Kraftwerken, Speichern und Importen gedeckt.</p>
            </InfoButton>
          </>
        }
      />
      <div className={`mt-4 flex flex-col gap-4 ${compact ? '' : 'sm:flex-row sm:items-center'}`}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col-reverse gap-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((l) => (
              <span key={l} className="block h-3 w-8 rounded-sm transition-colors" style={{ background: l <= status.level ? LEVEL_COLOR[status.level] : 'var(--c-border)', opacity: l <= status.level ? 1 : 0.6 }} />
            ))}
          </div>
          <div>
            <div className="font-display text-3xl font-bold leading-none" style={{ color }} data-testid="defcon-level">
              {text.title}
            </div>
            <div className="mt-1 max-w-[18rem] text-sm text-text-2">{settings.humor === 'professional' ? `Kapazitätsfaktor Wind + PV: ${formatPercent((status.cf ?? 0) * 100, 0)}` : text.satire}</div>
            {status.escalated && <div className="mt-1 text-xs text-amber">Eskaliert: seit {formatNumber(status.lowHours, 0)} h unter {Math.round(th.lowCf * 100)} % der installierten Leistung.</div>}
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center [&>div]:min-w-0">
          <div className="rounded-lg border border-border px-2 py-2">
            <Wind size={14} className="mx-auto text-sky-400" aria-hidden="true" />
            <div className="readout mt-1 truncate text-sm font-semibold sm:text-base">{formatPower(status.windMw)}</div>
            <div className="truncate text-[10px] text-text-3">Wind{status.windCf !== null ? ` · ${formatPercent(status.windCf * 100, 0)}` : ''}</div>
          </div>
          <div className="rounded-lg border border-border px-2 py-2">
            <Sun size={14} className="mx-auto text-yellow-300" aria-hidden="true" />
            <div className="readout mt-1 truncate text-sm font-semibold sm:text-base">{formatPower(status.solarMw)}</div>
            <div className="truncate text-[10px] text-text-3">Solar{status.solarCf !== null ? ` · ${formatPercent(status.solarCf * 100, 0)}` : ''}</div>
          </div>
          <div className="rounded-lg border border-border px-2 py-2">
            <div className="font-mono text-[10px] text-text-3">Σ</div>
            <div className="readout mt-1 truncate text-sm font-semibold sm:text-base">{formatPower(status.vreMw)}</div>
            <div className="truncate text-[10px] text-text-3">{status.cf !== null ? `${formatPercent(status.cf * 100, 0)} von ${formatGw(status.capacity.totalVreGw, 0)}` : 'Kapazität unbekannt'}</div>
          </div>
        </div>
      </div>
      {!compact && rows.length > 2 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={rows} margin={CHART_MARGIN}>
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t: number) => formatBerlinTime(t)} tick={axisStyle} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} minTickGap={50} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${Math.round(v / 1000)}`} />
              <Tooltip
                cursor={{ stroke: 'var(--c-border-strong)' }}
                wrapperStyle={tooltipWrapperStyle}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload as (typeof rows)[number];
                  return (
                    <ChartTooltip
                      title={`${formatBerlinTime(r.t)} Uhr`}
                      rows={[
                        { label: 'Wind', value: formatPower(r.wind), color: CATEGORY_COLORS.windOnshore },
                        { label: 'Solar', value: formatPower(r.solar), color: CATEGORY_COLORS.solar },
                        { label: 'Kapazitätsfaktor', value: r.cf !== null ? formatPercent(r.cf * 100, 0) : '–' },
                      ]}
                    />
                  );
                }}
              />
              <Area type="monotone" dataKey="wind" stackId="vre" stroke={CATEGORY_COLORS.windOnshore} fill={CATEGORY_COLORS.windOnshore} fillOpacity={0.6} isAnimationActive={animationsEnabled(settings)} animationDuration={500} dot={false} />
              <Area type="monotone" dataKey="solar" stackId="vre" stroke={CATEGORY_COLORS.solar} fill={CATEGORY_COLORS.solar} fillOpacity={0.6} isAnimationActive={animationsEnabled(settings)} animationDuration={500} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-1 font-mono text-[10px] text-text-3">
            GW, letzte 24 h · Stand {formatBerlinTime(status.t)} Uhr ({formatAge(status.ageMs)}) · installierte Leistung Stand {status.capacity.t ? formatBerlinTime(status.capacity.t).slice(0, 0) + new Date(status.capacity.t).toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }) : '–'}
          </p>
        </div>
      )}
      {compact && <p className="mt-3 font-mono text-[10px] text-text-3">Stand {formatBerlinTime(status.t)} Uhr · {formatAge(status.ageMs)}</p>}
    </Card>
  );
}
