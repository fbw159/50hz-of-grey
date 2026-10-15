import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { seededRandom } from '@/lib/timeseries';

interface ConfettiProps {
  /** Increment to fire a burst. */
  burst: number;
  count?: number;
}

const COLORS = ['var(--c-cyan)', 'var(--c-green)', 'var(--c-amber)', 'var(--c-purple)', 'var(--c-text)'];

/** Lightweight CSS confetti – transform/opacity only, removes itself. */
export function Confetti({ burst, count = 60 }: ConfettiProps) {
  // a burst is shown until its timer marks it as expired (state is only set from the timer)
  const [expired, setExpired] = useState(0);
  useEffect(() => {
    if (burst === 0) return;
    const t = setTimeout(() => setExpired(burst), 4200);
    return () => clearTimeout(t);
  }, [burst]);
  const active = burst > expired ? burst : 0;
  const pieces = useMemo(() => {
    const rnd = seededRandom(`confetti-${active}`); // pure: same burst → same pieces
    return Array.from({ length: count }, (_, i) => ({
      id: `${active}-${i}`,
      left: rnd() * 100,
      dx: (rnd() - 0.5) * 240,
      dur: 2.4 + rnd() * 1.6,
      delay: rnd() * 0.6,
      color: COLORS[i % COLORS.length],
      w: 6 + rnd() * 6,
    }));
  }, [active, count]);
  if (!active || typeof document === 'undefined') return null;
  return createPortal(
    <div aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            ['--dx' as string]: `${p.dx}px`,
            ['--dur' as string]: `${p.dur}s`,
            ['--delay' as string]: `${p.delay}s`,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
