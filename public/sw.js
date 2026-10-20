/* 50 Hz of Grey – minimal service worker
 *
 * Strategy:
 *  - navigation requests & data snapshot: network first, cache fallback
 *    (offline users see the last version, the app marks data as stale by
 *    its own timestamps – nothing is ever "fresh" just because it loaded)
 *  - hashed build assets (/assets/…): cache first (immutable by name)
 *  - everything else: network, no caching
 */
const VERSION = 'v2';
const CACHE = `50hz-${VERSION}`;
const scopePath = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('50hz-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const MAX_ASSETS = 80;
async function pruneAssets(cache) {
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'));
  if (keys.length <= MAX_ASSETS) return;
  // Cache.keys() returns entries in insertion order – drop the oldest ones.
  await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;

  const isAsset = url.pathname.includes('/assets/');
  const isNavigation = request.mode === 'navigate';
  const isData = url.pathname.endsWith('/data/latest.json');

  if (isAsset) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          pruneAssets(cache);
        }
        return response;
      }),
    );
    return;
  }

  if (isNavigation || isData) {
    // cache key without cache-busting query for the data file
    const key = isData ? new Request(url.origin + url.pathname) : request;
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(key, response.clone());
          return response;
        } catch {
          const cached = await cache.match(key);
          if (cached) return cached;
          if (isNavigation) {
            const index = await cache.match(new Request(url.origin + scopePath));
            if (index) return index;
          }
          throw new Error('offline');
        }
      }),
    );
  }
});
