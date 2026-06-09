const CACHE_NAME = 'ajn-sirius-cache-v1';

// These are the core files that make up your app's interface.
// We cache these so the app can load instantly, even offline.
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png'
];

// 1. INSTALL EVENT
// Runs the first time the browser sees this service worker.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching offline assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE EVENT
// Runs when the new service worker takes over. Great for cleaning up old caches.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH EVENT
// Intercepts network requests made by your app.
self.addEventListener('fetch', event => {
    // We only want to cache local requests for the app shell.
    // Skip caching for external video streams or your Cloudflare Worker payload.
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Network-first strategy for local assets: 
    // Try to get the freshest file from the network. If that fails (offline), serve the cached version.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
