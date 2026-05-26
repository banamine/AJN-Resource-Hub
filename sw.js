// Service Worker for AJN Archive Player - v3
// Enforces strict network-only fetching for RSS feeds to bypass caching issues.

const CACHE_NAME = 'ajn-glass-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css'
];

// Install: Cache essential assets
self.addEventListener('install', event => {
  console.log('[SW] Installing version 3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch: Strategy for handling network requests
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // RULE 1: RSS Feed - Network-Only
  // Uses no-store to ensure the browser/ServiceWorker never saves a stale version.
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    event.respondWith(
      fetch(event.request, { 
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
    return;
  }

  // RULE 2: Video Files - Pass through
  if (url.includes('.m4v') || url.includes('.mp4')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // RULE 3: Static Assets - Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
  );
});

// Activate: Cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating and cleaning old caches');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});