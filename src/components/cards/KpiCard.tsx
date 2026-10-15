import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { SatireTag, DemoTag } from '@/components/ui/Tags';
import { NumberTicker } from '@/components/animations/NumberTicker';

export interface KpiCardProps {
  label: ReactNode;
  /** Numeric value (animated) – or a ready-made node. */
  value: number | null;
  format: (v: number) => string;
  /** Caption under the value – satirical or neutral. */
  caption?: ReactNode;
  captionIsSatire?: boolean;
  /** Small meta line (timestamp, reference). */
  meta?: ReactNode;
  info?: { title: string; body: ReactNode };
  accent?: 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'text';
  /** Extra content (sparkline etc.). */
  children?: ReactNode;
  /** Mark the whole card as satire (e.g. bureaucracy index). */
  satire?: boolean;
  demo?: boolean;
  /** Management mode alternative label (shown above the real label). */
  managementLabel?: string;
  /** Visual state. */
  highlight?: boolean;
  className?: string;
  testId?: string;
}

const ACCENT: Record<NonNullable<KpiCardProps['accent']>, string> = {
  cyan: 'text-cyan',
  green: 'text-green',
  amber: 'text-amber',
  red: 'text-red',
  purple: 'text-purple',
  text: 'text-text',
};

export function KpiCard({ label, value, format, caption, captionIsSatire = true, meta, info, accent = 'text', children, satire, demo, managementLabel, highlight, className = '', testId }: KpiCardProps) {
  return (
    <Card className={`flex min-h-[150px] flex-col ${className}`} glow={highlight} data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {managementLabel && <div className="font-display text-xs font-semibold leading-tight text-purple">{managementLabel}</div>}
          <div className="label-caps leading-tight">{label}</div>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
          {satire && <SatireTag />}
          {info && <InfoButton title={info.title}>{info.body}</InfoButton>}
        </div>
      </div>
      <div className={`mt-2 text-[1.75rem] font-semibold leading-none sm:text-[2rem] ${ACCENT[accent]} ${highlight ? 'glow-text' : ''}`}>
        <NumberTicker value={value} format={format} />
      </div>
      {children && <div className="mt-2">{children}</div>}
      <div className="mt-auto pt-2">
        {caption && (
          <p className={`text-xs leading-snug ${captionIsSatire ? 'text-text-2' : 'text-text-2'}`}>
            {caption}
          </p>
        )}
        {meta && (
          <p className="mt-1 truncate font-mono text-[10px] text-text-3">
            {demo && <DemoTag className="mr-1 align-middle" />}
            {meta}
          </p>
        )}
      </div>
    </Card>
  );
}
