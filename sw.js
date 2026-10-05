/* ============================================================
   ELauncher Service Worker — Caching & Offline Support
   ============================================================ */

const CACHE_NAME = 'elauncher-cache-v3';
const RUNTIME_CACHE = 'elauncher-runtime-v3';

const PRECACHE_URLS = [
    './',
    './index.html',
    './mods.html',
    './manifest.json',
    './static/tailwind.css',
    './assets/wallpaper.png',
    './assets/favicon-32x32.png',
    './assets/favicon-16x16.png',
    './assets/apple-touch-icon.png',
    './assets/eaglercraft.png',
    './assets/webassembly.svg',
    './assets/js.svg',
    './assets/el_mods/button.png'
];

// Install: Cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing ELauncher Service Worker v3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching core files');
                return cache.addAll(PRECACHE_URLS).catch((err) => {
                    console.warn('[SW] Some files failed to pre-cache (this is OK):', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating ELauncher Service Worker v3...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Handle requests safely
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 1. Skip non-GET requests
    if (request.method !== 'GET') return;

    // 2. Skip empty or invalid URLs (THIS FIXES YOUR ERROR)
    if (!request.url || request.url === '' || request.url === 'about:blank') return;

    // 3. Skip non-HTTP requests
    if (!request.url.startsWith('http')) return;

    const url = new URL(request.url);

    // 4. Skip external requests (relays, websockets, etc.)
    if (url.origin !== self.location.origin) return;

    // 5. Skip websocket-related requests
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

    // Strategy: Cache-first for static assets, network-first for HTML/CSV
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|svg|gif|woff|woff2|ttf|ico|wasm)$/i.test(url.pathname);
    const isDocument = request.mode === 'navigate' || /\.(html)$/i.test(url.pathname);
    const isCSV = /\.csv$/i.test(url.pathname);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            }).catch(() => caches.match('./index.html'))
        );
    } else if (isDocument || isCSV) {
        event.respondWith(
            fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    return caches.match('./index.html');
                });
            })
        );
    } else {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
    }
});

// Message handler for offline caching
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_GAME') {
        const gameUrl = event.data.url;
        if (!gameUrl) return; // Don't crash on empty URLs

        console.log('[SW] Pre-caching game for offline use:', gameUrl);

        event.waitUntil(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                try {
                    const response = await fetch(gameUrl, { cache: 'no-store' });
                    if (!response.ok) throw new Error('Failed to fetch game file');
                    
                    const responseClone = response.clone();
                    await cache.put(gameUrl, responseClone);

                    const html = await response.text();
                    const assetRegex = /(src|href)=["']([^"']+\.(js|wasm))["']/g;
                    let match;
                    const urlsToCache = [];

                    while ((match = assetRegex.exec(html)) !== null) {
                        let assetUrl = match[2];
                        if (!assetUrl.startsWith('http') && !assetUrl.startsWith('//')) {
                            const baseUrl = new URL(gameUrl, self.location.origin).href;
                            assetUrl = new URL(assetUrl, baseUrl).href;
                            urlsToCache.push(assetUrl);
                        }
                    }

                    await Promise.all(urlsToCache.map(async (url) => {
                        try {
                            const assetRes = await fetch(url, { mode: 'no-cors' });
                            if (assetRes) await cache.put(url, assetRes);
                        } catch (e) {}
                    }));

                    event.source.postMessage({ type: 'CACHE_COMPLETE', url: gameUrl });
                } catch (err) {
                    console.error('[SW] Failed to cache game:', err);
                    event.source.postMessage({ type: 'CACHE_FAILED', url: gameUrl });
                }
            })
        );
    }
});