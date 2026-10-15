import { Zap } from 'lucide-react';
import type { RouteId } from '@/hooks/useHashRoute';
import { routeHref } from '@/hooks/useHashRoute';
import { NAV_ITEMS } from './navItems';
import { DataStatusLine } from '@/components/layout/DataStatus';

interface Props {
  active: RouteId;
  onNavigate: (page: RouteId) => void;
}

/** Desktop sidebar (hidden on phones – they get the bottom navigation). */
export function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border md:flex" style={{ background: 'var(--c-surface-alpha)', backdropFilter: 'blur(10px)' }}>
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan">
          <Zap size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight tracking-tight">50 Hz of Grey</div>
          <div className="truncate text-[11px] text-text-3">Grid Crisis Simulator</div>
        </div>
      </div>
      <nav className="flex-1 px-3" aria-label="Hauptnavigation">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <a
                  href={routeHref(item.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-cyan/12 text-cyan' : 'text-text-2 hover:bg-elevated hover:text-text'}`}
                  data-testid={`sidenav-${item.id}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border px-4 py-4">
        <DataStatusLine compact />
      </div>
    </aside>
  );
}
