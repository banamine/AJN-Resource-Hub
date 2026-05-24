// sw.js - Service Worker with version tracking
const CACHE_NAME = 'ajn-shell-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version v5...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.error('[SW] Cache open/add failed during install:', err))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v5...');
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME && key.startsWith('ajn-shell')) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
        return null;
      }).filter(p => p !== null)
    ))
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for feed
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Don't intercept or cache large video/audio streams
  if (url.includes('.m4v') || url.includes('.mp4') || url.includes('.mp3')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Network-first for the feed URL to always get latest
  if (url.includes('AJNHourlyVideo.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first for everything else (UI layout, fonts, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache valid responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => fetch(event.request))
  );
});
