// UPDATED CACHE NAME - Incremented to v2 to force cache invalidation
// This ensures all clients fetch the newly validated feed instead of cached corrupted data
const CACHE_NAME = 'ajn-glass-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing new version - cache invalidation triggered');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  // Bypass cache for RSS feeds - force network fetch to always get fresh data
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    console.log('[SW] Bypassing cache for RSS feed:', url);
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  
  // Video files - never cache, always stream fresh
  if (url.includes('.m4v') || url.includes('.mp4') || url.includes('stream.alexjones.media')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For static assets, use cache with network fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating new version - cleaning old caches');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});
