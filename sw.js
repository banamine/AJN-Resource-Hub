// Service Worker for AJN Archive Player
const CACHE_NAME = 'ajn-glass-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALL: Cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 2. FETCH: Strategy for handling network requests
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // RULE: RSS/Worker Feeds - Always fetch fresh (no-store)
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    event.respondWith(
      fetch(event.request, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
    );
    return;
  }

  // RULE: Static Assets - Cache-First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// 3. ACTIVATE: Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});