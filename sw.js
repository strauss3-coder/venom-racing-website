/**
 * sw.js - Venom Racing service worker.
 *
 * Deliberately conservative. Its only jobs are an offline page and a
 * faster repeat visit; it must never show a visitor out-of-date content.
 *
 *  - Pages, CSS and JS: network first. The cache is used only when the
 *    network fails, so a deploy is live on the very next load.
 *  - Images: served from cache, refreshed in the background.
 *  - Videos, range requests, POSTs and anything cross-origin (Supabase,
 *    Google): never touched. Live content and enquiries always go straight
 *    to the network.
 *  - A navigation that fails with nothing cached gets /offline.html.
 *
 * Bump VERSION to discard every cache on the next visit. To retire the
 * worker completely, replace this file with one that calls
 * self.registration.unregister() - see docs/OPERATIONS.md.
 */

const VERSION = 'v1';
const CORE = 'venom-core-' + VERSION;
const RUNTIME = 'venom-runtime-' + VERSION;
const RUNTIME_MAX = 80;

const CORE_FILES = [
  '/offline.html',
  '/assets/css/variables.css',
  '/assets/css/styles.css',
  '/assets/css/components.css',
  '/assets/js/resilience.js',
  '/assets/js/status.js',
  '/assets/images/logo/venom-racing-logo-trans.png',
  '/favicon/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('venom-') && k !== CORE && k !== RUNTIME)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - RUNTIME_MAX; i += 1) await cache.delete(keys[i]);
}

async function networkFirst(request, fallbackToOffline) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      cache.put(request, response.clone()).then(() => trim(cache));
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached) return cached;
    if (fallbackToOffline) return caches.match('/offline.html');
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      cache.put(request, response.clone()).then(() => trim(cache));
    }
    return response;
  }).catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true));
    return;
  }
  if (/\.(css|js|json)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request, false));
    return;
  }
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
