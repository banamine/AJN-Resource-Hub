const CACHE_NAME = 'ajn-ui-v2';
const FEED_CACHE_NAME = 'ajn-feed-v2';
const FEED_URL = 'https://rss.alexjones.media/AJNHourlyVideo.html';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== FEED_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First strategy for feed (always try network, fallback to cache)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(FEED_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, falling back to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Feed unavailable offline', { status: 503, statusText: 'Offline' });
  }
}

// Cache-First for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for asset:', request.url);
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Network-First for feed URLs
  if (url.includes(FEED_URL) || url.includes(PROXY_URL)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Stale-While-Revalidate for video files (don't cache large videos)
  if (url.includes('.m4v') || url.includes('.mp4')) {
    // Let video streams go directly to network (no caching to save storage)
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Cache-First for everything else (HTML, CSS, manifest, icons)
  event.respondWith(cacheFirst(event.request));
});

// Handle skip-waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
