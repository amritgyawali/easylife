// Minimal PWA service worker for the web export.
//
// Scope is deliberately narrow: same-origin GET requests only. Supabase API
// calls (a different origin) and any non-GET request are left completely
// untouched by `fetch` — the app's own offline engine (TanStack persist +
// durable outbox, see src/services/offline/) already owns data freshness and
// write queuing, so this worker's only job is asset/shell caching, not data.
//
// Strategies:
//  - `_expo/static/...` bundle files are content-hashed (the filename changes
//    whenever the content does), so they're safe to cache-first forever.
//  - Everything else same-origin (HTML documents, manifest, icons) uses
//    network-first with a cache fallback, so a previously visited screen
//    still opens when offline, but online users always see the latest build.
const CACHE_NAME = 'lifeos-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isHashedAsset = url.pathname.startsWith('/_expo/static/');

  event.respondWith(isHashedAsset ? cacheFirst(request) : networkFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
