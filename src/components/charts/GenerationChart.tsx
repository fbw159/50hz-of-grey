import { useMemo } from 'react';
import { Area, AreaChart, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GENERATION_CATEGORIES, type GenerationCategoryId, type GenerationRow } from '@/features/production/productionMetrics';
import { formatBerlinTime } from '@/lib/dateUtils';
import { formatPower } from '@/lib/formatters';
import { ChartTooltip } from './ChartTooltip';
import { axisStyle, CATEGORY_COLORS, CHART_MARGIN, tooltipWrapperStyle } from './chartTheme';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';

interface Props {
  rows: GenerationRow[];
  height?: number;
  showLoad?: boolean;
  /** Only draw these categories (default: all). */
  categories?: GenerationCategoryId[];
  compact?: boolean;
  moreGreen?: boolean;
}

type ChartRow = { t: number; load: number | null } & Record<GenerationCategoryId, number | null>;

export function GenerationChart({ rows, height = 260, showLoad = true, categories, compact = false, moreGreen = false }: Props) {
  const settings = useSettings();
  const animate = animationsEnabled(settings);
  const data = useMemo<ChartRow[]>(
    () =>
      rows.map((r) => {
        const o = { t: r.t, load: r.load } as ChartRow;
        for (const cat of GENERATION_CATEGORIES) o[cat.id] = r.values[cat.id];
        return o;
      }),
    [rows],
  );
  const cats = GENERATION_CATEGORIES.filter((c) => !categories || categories.includes(c.id));
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-text-3" style={{ height }}>
        Noch keine Erzeugungsdaten für diesen Zeitraum.
      </div>
    );
  }
  const Chart = showLoad ? ComposedChart : AreaChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={CHART_MARGIN} stackOffset="none">
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t: number) => formatBerlinTime(t)} tick={axisStyle} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={compact ? 34 : 40} tickFormatter={(v: number) => `${Math.round(v / 1000)}`} label={compact ? undefined : { value: 'GW', position: 'insideTopLeft', offset: -2, style: { ...axisStyle } }} />
        <Tooltip
          cursor={{ stroke: 'var(--c-border-strong)' }}
          wrapperStyle={tooltipWrapperStyle}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as ChartRow;
            const list = [...cats].reverse().map((c) => ({ label: c.label, value: formatPower(row[c.id]), color: moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id] }));
            if (showLoad && row.load !== null) list.push({ label: 'Last', value: formatPower(row.load), color: 'var(--c-text)' });
            return <ChartTooltip title={`${formatBerlinTime(row.t)} Uhr`} rows={list} footer="Öffentliche Nettoerzeugung, 15-min-Mittel" />;
          }}
        />
        {cats.map((c) => (
          <Area
            key={c.id}
            type="monotone"
            dataKey={c.id}
            stackId="gen"
            stroke={moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id]}
            fill={moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id]}
            fillOpacity={moreGreen ? 0.35 + cats.indexOf(c) * 0.05 : 0.75}
            strokeWidth={0.5}
            isAnimationActive={animate}
            animationDuration={600}
            connectNulls={false}
            dot={false}
            activeDot={false}
          />
        ))}
        {showLoad && <Line type="monotone" dataKey="load" stroke="var(--c-text)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={animate} animationDuration={600} connectNulls={false} />}
      </Chart>
    </ResponsiveContainer>
  );
}

export function GenerationLegend({ categories, moreGreen = false }: { categories?: GenerationCategoryId[]; moreGreen?: boolean }) {
  const cats = GENERATION_CATEGORIES.filter((c) => !categories || categories.includes(c.id));
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-2">
      {[...cats].reverse().map((c) => (
        <li key={c.id} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id] }} aria-hidden="true" />
          {c.label}
        </li>
      ))}
    </ul>
  );
}
