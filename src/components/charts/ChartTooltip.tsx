import type { ReactNode } from 'react';

interface Row {
  label: string;
  value: string;
  color?: string;
}

interface Props {
  title: ReactNode;
  rows: Row[];
  footer?: ReactNode;
}

/** Shared tooltip body – compact, mono numbers, readable on phones. */
export function ChartTooltip({ title, rows, footer }: Props) {
  return (
    <div className="card card-elevated max-w-[240px] px-3 py-2 text-xs shadow-xl" style={{ backdropFilter: 'none' }}>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">{title}</div>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-text-2">
              {r.color && <span className="inline-block h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden="true" />}
              {r.label}
            </span>
            <span className="readout text-text">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1 text-[10px] text-text-3">{footer}</div>}
    </div>
  );
}
