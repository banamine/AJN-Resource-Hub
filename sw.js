// UPDATED CACHE NAME - Incremented to v3 to force cache invalidation
// This ensures all clients fetch the newly validated feed instead of cached corrupted data
const CACHE_NAME = 'ajn-glass-v3';
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

  // RSS FEED: Force network-only with a cache-busting timestamp
  // This bypasses the cache entirely, ensuring you get the 
  // absolute latest segment list every single time.
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    console.log('[SW] Bypassing cache for RSS feed:', url);
    const freshUrl = new URL(url);
    freshUrl.searchParams.set('_t', Date.now()); 
    
    event.respondWith(
      fetch(freshUrl, { 
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
    return;
  }
  
  // VIDEO FILES: Never cache, always stream live
  if (url.includes('.m4v') || url.includes('.mp4') || url.includes('stream.alexjones.media')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // STATIC ASSETS: Cache-First
  // Improves load times for your UI elements
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
