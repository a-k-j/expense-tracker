// sw.js — Service Worker: cache-first strategy for offline support

const CACHE_NAME = 'spendsense-v7';
const STATIC_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './js/app.js',
  './js/db.js',
  './js/utils/date-utils.js',
  './js/utils/csv-export.js',
  './js/utils/json-backup.js',
  './js/components/toast.js',
  './js/components/category-grid.js',
  './js/components/expense-form.js',
  './js/components/expense-list.js',
  './js/components/chart.js',
  './js/components/date-picker.js',
  './js/views/dashboard.js',
  './js/views/history.js',
  './js/views/analytics.js',
  './js/views/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // CDN
  'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
];

// ── Install: pre-cache all static assets ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache what we can; don't fail install if CDN is unreachable
      const results = await Promise.allSettled(
        STATIC_URLS.map(url => cache.add(url).catch(() => null))
      );
      return results;
    })
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, network fallback ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type !== 'opaqueredirect') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
