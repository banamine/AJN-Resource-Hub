// sw.js - Proper Service Worker with NO DOM manipulation
const CACHE_NAME = 'ajn-shell-v4';
const ASSETS_TO_CACHE = [
  './',
  './new ajn music.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.error('[SW] Cache open/add failed during install:', err))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => key !== CACHE_NAME && caches.delete(key))
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
  
  // Cache-first for everything else (UI layout, fonts, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache newly discovered assets dynamically if needed
        return response;
      });
    }).catch(() => fetch(event.request))
  );
});
