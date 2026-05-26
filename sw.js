const CACHE_NAME = 'ajn-glass-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // RSS FEED: Force Network-Only (No Cache)
  if (url.includes('rss.alexjones.media') || url.includes('AJNHourlyVideo')) {
    event.respondWith(
      fetch(event.request, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
    );
    return;
  }
  
  // VIDEO: Stream Live
  if (url.includes('.m4v') || url.includes('.mp4')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // EVERYTHING ELSE: Cache-First
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});
