import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';

interface NumberTickerProps {
  value: number | null;
  format: (v: number) => string;
  /** Duration of the count-up in ms. */
  durationMs?: number;
  className?: string;
  /** Text shown for null. */
  placeholder?: string;
}

/**
 * Counts from the previous to the new value when the value changes.
 * The displayed end state is always the exact value – only the transition is animated.
 */
export function NumberTicker({ value, format, durationMs = 700, className = '', placeholder = '–' }: NumberTickerProps) {
  const settings = useSettings();
  const animated = animationsEnabled(settings);
  const [display, setDisplay] = useState<number | null>(value);

  useEffect(() => {
    if (!animated || value === null || display === null || display === value) return;
    const controls = animate(display, value, {
      duration: durationMs / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
    // only re-run when the target value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animated, durationMs]);

  const shown = animated && display !== null && value !== null ? display : value;
  return <span className={`readout ${className}`}>{shown === null ? placeholder : format(shown)}</span>;
}
