import { useId } from 'react';

interface SparklineProps {
  points: { t: number; v: number }[];
  width?: number;
  height?: number;
  stroke?: string;
  /** Draw a horizontal reference line at this value (e.g. 50 Hz or 0 €/MWh). */
  reference?: number | null;
  /** Fill area below the line. */
  area?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Tiny dependency-free SVG sparkline (real samples only, no smoothing). */
export function Sparkline({ points, width = 160, height = 40, stroke = 'var(--c-cyan)', reference = null, area = true, className = '', ariaLabel }: SparklineProps) {
  const id = useId();
  if (points.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  if (reference !== null) {
    min = Math.min(min, reference);
    max = Math.max(max, reference);
  }
  if (max - min < 1e-9) {
    max += 1;
    min -= 1;
  }
  const pad = 3;
  const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (width - 2 * pad);
  const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const areaD = `${d} L${x(t1).toFixed(1)},${height - pad} L${x(t0).toFixed(1)},${height - pad} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {reference !== null && <line x1={pad} x2={width - pad} y1={y(reference)} y2={y(reference)} stroke="var(--c-border-strong)" strokeDasharray="3 3" strokeWidth="1" />}
      {area && <path d={areaD} fill={`url(#${id}-g)`} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
