// satoshi-Qore Service Worker
// Offline-first strategy with stale-while-revalidate for pages

const CACHE_NAME = 'sqore-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/projects.html',
  '/tools.html',
  '/writing.html',
  '/404.html',
  '/manifest.json',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, stale-while-revalidate for pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Pass through GitHub API and external requests
  if (!url.hostname.includes('satoshi-qore.github.io') && !url.hostname.includes('localhost')) {
    return;
  }

  // Stale-while-revalidate for HTML pages
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => null);

      // Return cached immediately, update in background
      return cached || networkPromise || caches.match('/404.html');
    })
  );
});
