import { Briefcase, Share2, Zap } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { formatBerlinTime } from '@/lib/dateUtils';
import { pickMessage, rotationSlot } from '@/lib/humorEngine';
import { useSettings, settingsStore } from '@/features/settings/settingsStore';
import { useGridData } from '@/hooks/useGridData';
import { DataStatusLine } from './DataStatus';

interface Props {
  onShare: () => void;
  onToggleManagement: () => void;
}

export function Header({ onShare, onToggleManagement }: Props) {
  const now = useNow(1000);
  const settings = useSettings();
  const data = useGridData();
  const subtitle = pickMessage('subtitle', { seed: `sub-${rotationSlot(now, 3)}`, intensity: settings.humor })?.title ?? 'Keeping the lights on. Against all odds.';
  const status = pickMessage('systemStatus', { seed: `status-${rotationSlot(now, 1)}`, intensity: settings.humor });
  const statusText = settings.humor === 'professional' ? (data.status === 'ready' ? 'DATEN GELADEN' : 'DATEN WERDEN GELADEN') : (status?.title ?? 'NETZ EXISTIERT NOCH');
  const tone = settings.humor === 'professional' ? 'ok' : status?.severity === 'warning' ? 'warn' : 'ok';
  const dotColor = tone === 'warn' ? 'var(--c-amber)' : 'var(--c-green)';

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border" style={{ background: 'var(--c-surface-alpha)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan md:hidden">
          <Zap size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate font-display text-base font-bold leading-tight tracking-tight sm:text-lg">50 Hz of Grey</h1>
            <span className="hidden truncate text-xs text-text-3 sm:inline">German Grid Emotional Support System</span>
          </div>
          <p className="truncate text-[11px] text-text-2 sm:text-xs" data-testid="subtitle">
            {subtitle}
          </p>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <DataStatusLine compact />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-2 sm:inline-flex" data-testid="system-status">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: dotColor, ['--pulse-color' as string]: dotColor }} aria-hidden="true" />
            {statusText}
          </span>
          <span className="readout rounded-md border border-border px-2 py-1 text-xs text-text-2" aria-label="Uhrzeit (Europe/Berlin)" data-testid="clock">
            {formatBerlinTime(now, true)}
          </span>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${settings.managementMode ? 'text-purple' : ''}`}
            onClick={onToggleManagement}
            aria-pressed={settings.managementMode}
            aria-label="Management Mode umschalten"
            title="MANAGEMENT MODE™"
            data-testid="management-toggle"
          >
            <Briefcase size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onShare} aria-label="Teilen" data-testid="share-button">
            <Share2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 pb-2 sm:hidden">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-2">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: dotColor, ['--pulse-color' as string]: dotColor }} aria-hidden="true" />
          {statusText}
        </span>
        <span className="ml-auto">
          <DataStatusLine compact />
        </span>
      </div>
      {settings.managementMode && (
        <div className="border-t border-purple/30 bg-purple/10 px-4 py-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-purple" data-testid="management-banner">
          Management Mode™ aktiv · Less engineering. More PowerPoint.
        </div>
      )}
      {settings.demoMode && (
        <div className="border-t border-amber/40 bg-amber/10 px-4 py-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-amber" data-testid="demo-banner">
          DEMO – SIMULIERTE DATEN
        </div>
      )}
      {!settings.demoMode && data.offline && (
        <div className="border-t border-amber/40 bg-amber/10 px-4 py-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
          Offline – zwischengespeicherte Daten, möglicherweise veraltet
        </div>
      )}
      {settings.managementMode && settings.moreGreen && (
        <button type="button" className="sr-only" onClick={() => settingsStore.set('moreGreen', false)}>
          Mehr Grün deaktivieren
        </button>
      )}
    </header>
  );
}
