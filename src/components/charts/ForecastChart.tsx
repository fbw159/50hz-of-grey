import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBerlinTime, formatBerlinShortDate } from '@/lib/dateUtils';
import { formatPower } from '@/lib/formatters';
import { ChartTooltip } from './ChartTooltip';
import { axisStyle, CHART_MARGIN, tooltipWrapperStyle } from './chartTheme';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';

export interface ForecastRow {
  t: number;
  forecast: number | null;
  actual: number | null;
}

interface Props {
  rows: ForecastRow[];
  color: string;
  label: string;
  height?: number;
  showDate?: boolean;
}

/** Day-ahead forecast (dashed) vs measured value (solid). */
export function ForecastChart({ rows, color, label, height = 200, showDate = false }: Props) {
  const settings = useSettings();
  const animate = animationsEnabled(settings);
  if (rows.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-text-3" style={{ height }}>
        Keine Prognosedaten verfügbar.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={CHART_MARGIN}>
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t: number) => (showDate ? `${formatBerlinShortDate(t)} ${formatBerlinTime(t)}` : formatBerlinTime(t))} tick={axisStyle} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} minTickGap={60} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${Math.round(v / 1000)}`} />
        <Tooltip
          cursor={{ stroke: 'var(--c-border-strong)' }}
          wrapperStyle={tooltipWrapperStyle}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as ForecastRow;
            return (
              <ChartTooltip
                title={`${formatBerlinShortDate(r.t)} ${formatBerlinTime(r.t)} Uhr`}
                rows={[
                  { label: `${label} Prognose`, value: formatPower(r.forecast), color },
                  { label: `${label} Ist`, value: formatPower(r.actual), color: 'var(--c-text)' },
                ]}
                footer="Day-Ahead-Prognose vs. öffentliche Nettoerzeugung"
              />
            );
          }}
        />
        <Area type="monotone" dataKey="forecast" stroke={color} strokeDasharray="5 4" strokeWidth={1.5} fill={color} fillOpacity={0.12} dot={false} isAnimationActive={animate} animationDuration={500} connectNulls={false} />
        <Line type="monotone" dataKey="actual" stroke="var(--c-text)" strokeWidth={1.8} dot={false} isAnimationActive={animate} animationDuration={500} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
