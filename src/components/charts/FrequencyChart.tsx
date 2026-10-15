import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Sample } from '@/lib/timeseries';
import { formatBerlinTime } from '@/lib/dateUtils';
import { formatHz, formatMilliHz } from '@/lib/formatters';
import { ChartTooltip } from './ChartTooltip';
import { axisStyle, CHART_MARGIN, tooltipWrapperStyle } from './chartTheme';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';

interface Props {
  samples: Sample[];
  height?: number;
  /** Show the ±50 mHz band (normal operating band shown for orientation). */
  showBand?: boolean;
  moreGreen?: boolean;
}

/** Measured frequency (real samples only, min/max-preserving downsampling). */
export function FrequencyChart({ samples, height = 220, showBand = true, moreGreen = false }: Props) {
  const settings = useSettings();
  if (samples.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-text-3" style={{ height }}>
        Keine Frequenzmessungen im gewählten Fenster.
      </div>
    );
  }
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
  }
  const span = Math.max(0.06, (max - min) * 1.4);
  const mid = (min + max) / 2;
  const domain: [number, number] = [Math.min(49.95, mid - span / 2), Math.max(50.05, mid + span / 2)];
  const stroke = moreGreen ? 'var(--c-green)' : 'var(--c-cyan)';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={samples} margin={CHART_MARGIN}>
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t: number) => formatBerlinTime(t)} tick={axisStyle} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} minTickGap={50} />
        <YAxis domain={domain} tick={axisStyle} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => v.toFixed(3).replace('.', ',')} />
        {showBand && <ReferenceArea y1={49.95} y2={50.05} fill="var(--c-green)" fillOpacity={0.06} />}
        <ReferenceLine y={50} stroke="var(--c-border-strong)" strokeDasharray="4 3" />
        <Tooltip
          cursor={{ stroke: 'var(--c-border-strong)' }}
          wrapperStyle={tooltipWrapperStyle}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const s = payload[0].payload as Sample;
            return <ChartTooltip title={`${formatBerlinTime(s.t, true)} Uhr`} rows={[{ label: 'Frequenz', value: formatHz(s.v, 4) }, { label: 'Abweichung', value: formatMilliHz(s.v - 50, 1) }]} footer="Messwert, nicht interpoliert" />;
          }}
        />
        <Line type="linear" dataKey="v" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={animationsEnabled(settings)} animationDuration={500} />
      </LineChart>
    </ResponsiveContainer>
  );
}
