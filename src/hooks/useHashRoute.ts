import { useCallback, useSyncExternalStore } from 'react';

/**
 * Minimal hash router. Routes look like "#/market" – reloading any route on
 * GitHub Pages works because the server only ever sees index.html.
 */
export type RouteId = 'control' | 'market' | 'generation' | 'lab' | 'more';
export type SubRoute = string | null;

export interface Route {
  page: RouteId;
  sub: SubRoute;
  raw: string;
}

const PAGES: Record<string, RouteId> = {
  '': 'control',
  control: 'control',
  leitwarte: 'control',
  market: 'market',
  boerse: 'market',
  generation: 'generation',
  erzeugung: 'generation',
  lab: 'lab',
  labor: 'lab',
  more: 'more',
  mehr: 'more',
};

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [first = '', second = ''] = raw.split('?')[0].split('/');
  const page = PAGES[first.toLowerCase()] ?? 'control';
  return { page, sub: second ? decodeURIComponent(second) : null, raw };
}

export function routeHref(page: RouteId, sub?: string | null): string {
  return `#/${page}${sub ? `/${encodeURIComponent(sub)}` : ''}`;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
function getSnapshot() {
  return window.location.hash;
}
function getServerSnapshot() {
  return '';
}

export function useHashRoute(): { route: Route; navigate: (page: RouteId, sub?: string | null) => void } {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const navigate = useCallback((page: RouteId, sub?: string | null) => {
    const next = routeHref(page, sub);
    if (window.location.hash !== next) window.location.hash = next;
    else window.scrollTo({ top: 0 });
  }, []);
  return { route: parseHash(hash), navigate };
}
