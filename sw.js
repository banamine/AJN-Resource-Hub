const CACHE_NAME = 'ajn-glass-v1';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('.m4v') || url.includes('.mp4') || url.includes('stream.alexjones.media')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
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
