const CACHE_NAME = 'dientelink-v5';
const STATIC_CACHE = 'dientelink-static-v5';

// Core shell URLs to pre-cache on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install event - cache shell + activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache each URL individually so one failure doesn't break install
                return Promise.all(
                    PRECACHE_URLS.map((url) =>
                        fetch(url)
                            .then((response) => {
                                if (response && response.status === 200) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(() => { /* skip failed URLs silently */ })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - purge ALL old caches, claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Helper: is this a hashed/immutable asset? (Vite outputs like /assets/index-abc123.js)
function isHashedAsset(url) {
    return url.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|png|jpg|svg)$/i.test(url.pathname);
}

// Helper: is this a Supabase API call?
function isAPICall(url) {
    return url.pathname.startsWith('/rest/') ||
           url.hostname.includes('supabase') ||
           url.pathname.startsWith('/auth/') ||
           url.pathname.startsWith('/storage/');
}

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip non-same-origin except Supabase
    if (!url.origin.startsWith(self.location.origin) && !url.hostname.includes('supabase')) return;

    // API calls → network-only (data freshness matters, persistence layer handles offline)
    if (isAPICall(url)) return;

    // Hashed assets (JS/CSS bundles with content hash) → Cache-first (immutable)
    if (isHashedAsset(url)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // HTML navigations → Network-first with cache fallback (SPA: always serve index.html for routes)
    const isNavigation = event.request.mode === 'navigate';
    const isHTML = url.pathname.endsWith('.html') || url.pathname === '/';

    if (isNavigation || isHTML) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline: try exact match first, then fall back to cached index.html
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // All other assets (fonts, images, non-hashed JS) → Stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request).then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
