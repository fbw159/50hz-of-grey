import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { PanicResult } from './panicIndex';
import { SatireTag } from '@/components/ui/Tags';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { formatNumber } from '@/lib/formatters';

interface Props {
  panic: PanicResult | null;
  compact?: boolean;
}

const TONE_COLOR: Record<string, string> = {
  ok: 'var(--c-green)',
  info: 'var(--c-cyan)',
  warn: 'var(--c-amber)',
  critical: 'var(--c-red)',
};

export function PanicGauge({ panic, compact = false }: Props) {
  const id = useId();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const value = panic?.value ?? 0;
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const from = shown;
    let frame = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  // gauge geometry: 240° arc
  const size = compact ? 200 : 260;
  const r = size / 2 - 18;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = 210;
  const sweep = 240;
  const toXY = (angle: number, radius = r) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };
  const arcPath = (from: number, to: number, radius = r) => {
    const s = toXY(from, radius);
    const e = toXY(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const valueAngle = startAngle + (sweep * Math.max(0, Math.min(100, shown))) / 100;
  const color = TONE_COLOR[panic?.category.tone ?? 'ok'];
  const needle = toXY(valueAngle, r - 6);
  const ticks = Array.from({ length: 11 }, (_, i) => startAngle + (sweep * i) / 10);

  return (
    <Card className="flex flex-col items-center text-center" elevated data-testid="panic-gauge">
      <div className="flex w-full items-start justify-between">
        <div className="text-left">
          <div className="font-display text-base font-bold tracking-tight">GRID PANIC INDEX™</div>
          <div className="text-[11px] text-text-3">Scientifically questionable. Emotionally accurate.</div>
        </div>
        <SatireTag />
      </div>
      <button type="button" className="mt-2 rounded-xl" onClick={() => setOpen(true)} aria-label="Erklärung des Grid Panic Index anzeigen" data-testid="panic-open">
        <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`} role="img" aria-label={`Grid Panic Index ${value} von 100`}>
          <defs>
            <linearGradient id={`${id}-arc`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--c-green)" />
              <stop offset="45%" stopColor="var(--c-cyan)" />
              <stop offset="70%" stopColor="var(--c-amber)" />
              <stop offset="100%" stopColor="var(--c-red)" />
            </linearGradient>
            <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={arcPath(startAngle, startAngle + sweep)} stroke="var(--c-border)" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={arcPath(startAngle, startAngle + sweep)} stroke={`url(#${id}-arc)`} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.25" />
          <path d={arcPath(startAngle, Math.max(startAngle + 0.5, valueAngle))} stroke={`url(#${id}-arc)`} strokeWidth="12" fill="none" strokeLinecap="round" filter={`url(#${id}-glow)`} />
          {ticks.map((a, i) => {
            const o = toXY(a, r + 12);
            const inner = toXY(a, r + 7);
            return <line key={i} x1={inner.x} y1={inner.y} x2={o.x} y2={o.y} stroke="var(--c-border-strong)" strokeWidth={i % 5 === 0 ? 2 : 1} />;
          })}
          <motion.line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill={color} />
          <text x={cx} y={cy - 28} textAnchor="middle" className="readout" style={{ fill: 'var(--c-text)', fontSize: compact ? 44 : 56, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {formatNumber(shown, 0)}
          </text>
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fill: 'var(--c-text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
            VON 100
          </text>
          <text x={toXY(startAngle, r + 26).x} y={toXY(startAngle, r + 26).y + 4} textAnchor="middle" style={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            0
          </text>
          <text x={toXY(startAngle + sweep, r + 26).x} y={toXY(startAngle + sweep, r + 26).y + 4} textAnchor="middle" style={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            100
          </text>
        </svg>
      </button>
      <div className="-mt-2 font-display text-sm font-semibold" style={{ color }} data-testid="panic-category">
        {panic ? `KRISENSTUFE ${panic.value} – ${panic.category.label}` : 'Noch keine Daten für eine fundierte Panik.'}
      </div>
      <button type="button" className="btn btn-ghost btn-sm mt-1 text-text-3" onClick={() => setOpen(true)}>
        Wie wird das berechnet? <ChevronDown size={14} aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Grid Panic Index™ – Berechnung" size="sm">
        <p className="text-sm text-text-2">Berechnet aus echten Strommarktdaten und 37 % unbegründeter Ingenieurpanik. Der Index ist Satire und keine Bewertung der Netzsicherheit.</p>
        {panic && (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
            {panic.components.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-text">
                    {c.label}
                    {c.satire && <SatireTag />}
                  </div>
                  <div className="text-xs text-text-3">{c.note}</div>
                </div>
                <span className="readout shrink-0 text-text">{c.points > 0 ? '+' : ''}{formatNumber(c.points, 1)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-text-2">
              <span>× Bürokratie-Multiplikator</span>
              <span className="readout">{formatNumber(panic.multiplier, 3)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 px-3 py-2 font-semibold text-text">
              <span>Ergebnis (0–100)</span>
              <span className="readout">{panic.value}</span>
            </li>
          </ul>
        )}
        <div className="mt-3 text-xs text-text-3">
          <div className="label-caps mb-1">Stufen</div>
          <ul className="space-y-0.5">
            <li>0–20 Alles ruhig. Verdächtig ruhig.</li>
            <li>21–40 Excel wurde geöffnet.</li>
            <li>41–60 Erste PowerPoint zur Lagebewertung.</li>
            <li>61–80 Der Abteilungsleiter fragt nach Redispatch.</li>
            <li>81–95 Außerordentliche Krisensitzung.</li>
            <li>96–100 Management wurde informiert. Jetzt wird es kritisch.</li>
          </ul>
        </div>
      </Sheet>
    </Card>
  );
}
