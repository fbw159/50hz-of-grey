import type { ReactNode } from 'react';
import { Database, FlaskConical, Radio, HardDrive, Sparkles } from 'lucide-react';
import type { DataOrigin } from '@/types/data';

export function SatireTag({ children = 'Satire', className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`satire-tag ${className}`} title="Satirischer Wert – keine Messung">
      <Sparkles size={10} aria-hidden="true" />
      {children}
    </span>
  );
}

export function DemoTag({ className = '' }: { className?: string }) {
  return (
    <span className={`satire-tag demo-tag ${className}`} title="Demo-Modus: simulierte Daten">
      <FlaskConical size={10} aria-hidden="true" />
      Demo
    </span>
  );
}

const ORIGIN_META: Record<DataOrigin, { label: string; icon: ReactNode; className: string }> = {
  live: { label: 'Live', icon: <Radio size={10} aria-hidden="true" />, className: 'border-green/50 text-green bg-green/10' },
  snapshot: { label: 'Snapshot', icon: <Database size={10} aria-hidden="true" />, className: 'border-cyan/50 text-cyan bg-cyan/10' },
  cache: { label: 'Cache', icon: <HardDrive size={10} aria-hidden="true" />, className: 'border-amber/50 text-amber bg-amber/10' },
  demo: { label: 'Demo', icon: <FlaskConical size={10} aria-hidden="true" />, className: 'border-amber/60 text-amber bg-amber/12' },
};

export function OriginTag({ origin, className = '' }: { origin: DataOrigin; className?: string }) {
  const meta = ORIGIN_META[origin];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${meta.className} ${className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

export function Tone({ tone, children, className = '' }: { tone: 'ok' | 'info' | 'warn' | 'critical' | 'success' | 'warning'; children: ReactNode; className?: string }) {
  const map: Record<string, string> = {
    ok: 'text-green',
    success: 'text-green',
    info: 'text-cyan',
    warn: 'text-amber',
    warning: 'text-amber',
    critical: 'text-red',
  };
  return <span className={`${map[tone] ?? ''} ${className}`}>{children}</span>;
}
