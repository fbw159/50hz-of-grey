import { useId, useMemo } from 'react';
import { Area, AreaChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PricePoint } from '@/features/prices/priceMetrics';
import { HIGH_PRICE_THRESHOLD } from '@/features/prices/priceMetrics';
import { formatBerlinTime } from '@/lib/dateUtils';
import { formatCtPerKwh, formatPrice } from '@/lib/formatters';
import { ChartTooltip } from './ChartTooltip';
import { axisStyle, CHART_MARGIN, tooltipWrapperStyle } from './chartTheme';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';

interface Props {
  points: PricePoint[];
  /** Start of the currently valid interval (highlighted). */
  currentStart?: number | null;
  height?: number;
  /** Day label used in the tooltip. */
  dayLabel?: string;
  /** Visual "more green" management nonsense: recolours the chart without touching data. */
  moreGreen?: boolean;
}

interface Row {
  t: number;
  end: number;
  value: number | null;
}

/**
 * Step chart of day-ahead prices with the real interval length. Colour bands
 * are derived from the data: green below 0 €/MWh, amber above the (self
 * chosen) high-price threshold, cyan in between.
 */
export function PriceChart({ points, currentStart = null, height = 220, dayLabel, moreGreen = false }: Props) {
  const settings = useSettings();
  const id = useId();
  const rows = useMemo<Row[]>(() => {
    const r: Row[] = points.map((p) => ({ t: p.t, end: p.end, value: p.value }));
    // step charts need a closing point so the last interval is drawn with its full width
    const last = r[r.length - 1];
    if (last) r.push({ t: last.end, end: last.end, value: last.value });
    return r;
  }, [points]);
  const hasData = rows.some((r) => r.value !== null);
  const [min, max] = useMemo(() => {
    const vals = rows.map((r) => r.value).filter((v): v is number => v !== null);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const pad = Math.max(5, (hi - lo) * 0.08);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [rows]);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center text-sm text-text-3" style={{ height }}>
        Keine Preisdaten für diesen Tag.
      </div>
    );
  }

  const span = max - min || 1;
  const offsetOf = (v: number) => Math.min(1, Math.max(0, (max - v) / span));
  const offHigh = offsetOf(HIGH_PRICE_THRESHOLD);
  const offZero = offsetOf(0);
  const current = rows.find((r) => r.t === currentStart);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="0" y2="1">
            {moreGreen ? (
              <stop offset="0" stopColor="var(--c-green)" />
            ) : (
              <>
                <stop offset={0} stopColor="var(--c-amber)" />
                <stop offset={offHigh} stopColor="var(--c-amber)" />
                <stop offset={offHigh} stopColor="var(--c-cyan)" />
                <stop offset={offZero} stopColor="var(--c-cyan)" />
                <stop offset={offZero} stopColor="var(--c-green)" />
                <stop offset={1} stopColor="var(--c-green)" />
              </>
            )}
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            {moreGreen ? (
              <>
                <stop offset={0} stopColor="var(--c-green)" stopOpacity={0.5} />
                <stop offset={1} stopColor="var(--c-green)" stopOpacity={0.05} />
              </>
            ) : (
              <>
                <stop offset={0} stopColor="var(--c-amber)" stopOpacity={0.45} />
                <stop offset={offHigh} stopColor="var(--c-amber)" stopOpacity={0.3} />
                <stop offset={offHigh} stopColor="var(--c-cyan)" stopOpacity={0.3} />
                <stop offset={offZero} stopColor="var(--c-cyan)" stopOpacity={0.04} />
                <stop offset={offZero} stopColor="var(--c-green)" stopOpacity={0.15} />
                <stop offset={1} stopColor="var(--c-green)" stopOpacity={0.45} />
              </>
            )}
          </linearGradient>
        </defs>
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t: number) => formatBerlinTime(t)} tick={axisStyle} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} minTickGap={40} />
        <YAxis domain={[min, max]} tick={axisStyle} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => `${Math.round(v)}`} />
        {current && <ReferenceArea x1={current.t} x2={current.end} fill="var(--c-text)" fillOpacity={0.14} stroke="var(--c-text)" strokeOpacity={0.5} />}
        <ReferenceLine y={0} stroke="var(--c-border-strong)" strokeWidth={1} />
        {!moreGreen && max > HIGH_PRICE_THRESHOLD && <ReferenceLine y={HIGH_PRICE_THRESHOLD} stroke="var(--c-amber)" strokeOpacity={0.4} strokeDasharray="3 4" />}
        <Tooltip
          cursor={{ stroke: 'var(--c-border-strong)' }}
          wrapperStyle={tooltipWrapperStyle}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Row;
            if (row.t === row.end) return null;
            return (
              <ChartTooltip
                title={`${dayLabel ? `${dayLabel} · ` : ''}${formatBerlinTime(row.t)}–${formatBerlinTime(row.end)} Uhr`}
                rows={[
                  { label: 'Day-Ahead', value: formatPrice(row.value) },
                  { label: 'entspricht', value: formatCtPerKwh(row.value) },
                ]}
                footer={row.value !== null && row.value < 0 ? 'Negativer Großhandelspreis' : 'Großhandel DE-LU, kein Haushaltspreis'}
              />
            );
          }}
        />
        <Area type="stepAfter" dataKey="value" baseValue={0} stroke={`url(#${id}-stroke)`} strokeWidth={1.8} fill={`url(#${id}-fill)`} isAnimationActive={animationsEnabled(settings)} animationDuration={500} dot={false} activeDot={{ r: 3, fill: 'var(--c-text)', stroke: 'none' }} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
