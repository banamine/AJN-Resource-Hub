// Incremented to v2 to force browser to dump old cached feed data
const CACHE_NAME = 'ajn-glass-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/scraper.js',
  './js/visualizer.js',
  './js/player.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v2 - clearing old cache');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. RSS FEED: Force Network-Only (no-store)
  // This bypasses the cache entirely, ensuring you get the 
  // absolute latest segment list every single time.
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    event.respondWith(
      fetch(event.request, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(() => caches.match(event.request)) // Fallback to cache if offline
    );
    return;
  }
  
  // 2. VIDEO FILES: Never cache, always stream live
  if (url.includes('.m4v') || url.includes('.mp4') || url.includes('stream.alexjones.media')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 3. STATIC ASSETS: Cache-First
  // Improves load times for your UI elements
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});
