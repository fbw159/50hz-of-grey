import type { RouteId } from '@/hooks/useHashRoute';
import { routeHref } from '@/hooks/useHashRoute';
import { NAV_ITEMS } from './navItems';

interface Props {
  active: RouteId;
  onNavigate: (page: RouteId) => void;
}

/** Mobile bottom navigation – five thumb-sized targets, safe-area aware. */
export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Hauptnavigation">
      <div className="safe-bottom border-t border-border" style={{ background: 'var(--c-elevated-alpha)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
        <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex-1">
                <a
                  href={routeHref(item.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${isActive ? 'text-cyan' : 'text-text-3 hover:text-text-2'}`}
                  data-testid={`nav-${item.id}`}
                >
                  <span className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-cyan/15' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  <span className="leading-none">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
