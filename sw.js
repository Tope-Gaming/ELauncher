/* ============================================================
   ELauncher Service Worker — Caching & Offline Support
   ============================================================ */

const CACHE_NAME = 'elauncher-cache-v2';
const RUNTIME_CACHE = 'elauncher-runtime-v2';

// Files that are cached on install (the "core" of the launcher)
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
    console.log('[SW] Installing ELauncher Service Worker v2...');
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
    console.log('[SW] Activating ELauncher Service Worker v2...');
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

// Fetch: Cache-first for launcher assets, network-first for game files
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip external requests (relays, websockets, etc.)
    if (url.origin !== self.location.origin) return;

    // Skip websocket-related requests
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

    // Strategy: Cache-first for static assets, network-first for HTML/CSV
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|svg|gif|woff|woff2|ttf|ico|wasm)$/i.test(url.pathname);
    const isDocument = request.mode === 'navigate' || /\.(html)$/i.test(url.pathname);
    const isCSV = /\.csv$/i.test(url.pathname);

    if (isStaticAsset) {
        // Cache-first: serve from cache, fall back to network
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then((response) => {
                    // Cache a copy for later
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            }).catch(() => {
                // Offline fallback
                return caches.match('./index.html');
            })
        );
    } else if (isDocument || isCSV) {
        // Network-first: get fresh data, fall back to cache
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
        // Default: network with cache fallback
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
    }
});

// ============================================================
// OFFLINE GAME CACHING MESSAGE HANDLER
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_GAME') {
        const gameUrl = event.data.url;
        console.log('[SW] Pre-caching game for offline use:', gameUrl);

        event.waitUntil(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                try {
                    // 1. Fetch the main HTML file
                    const response = await fetch(gameUrl, { cache: 'no-store' });
                    if (!response.ok) throw new Error('Failed to fetch game file');
                    
                    // 2. Cache the main HTML file
                    const responseClone = response.clone();
                    await cache.put(gameUrl, responseClone);

                    // 3. Parse the HTML for linked JS/WASM assets
                    const html = await response.text();
                    const assetRegex = /(src|href)=["']([^"']+\.(js|wasm))["']/g;
                    let match;
                    const urlsToCache = [];

                    while ((match = assetRegex.exec(html)) !== null) {
                        let assetUrl = match[2];
                        // Ignore absolute URLs (external CDNs)
                        if (!assetUrl.startsWith('http') && !assetUrl.startsWith('//')) {
                            // Resolve relative paths to absolute URLs
                            const baseUrl = new URL(gameUrl, self.location.origin).href;
                            assetUrl = new URL(assetUrl, baseUrl).href;
                            urlsToCache.push(assetUrl);
                        }
                    }

                    // 4. Fetch and cache each asset
                    await Promise.all(urlsToCache.map(async (url) => {
                        try {
                            const assetRes = await fetch(url, { mode: 'no-cors' });
                            if (assetRes) {
                                await cache.put(url, assetRes);
                                console.log('[SW] Cached asset:', url);
                            }
                        } catch (e) {
                            console.warn('[SW] Failed to cache asset:', url, e);
                        }
                    }));

                    console.log('[SW] Successfully cached game:', gameUrl);
                    
                    // Notify the client that caching is complete
                    event.source.postMessage({ type: 'CACHE_COMPLETE', url: gameUrl });

                } catch (err) {
                    console.error('[SW] Failed to cache game:', err);
                    event.source.postMessage({ type: 'CACHE_FAILED', url: gameUrl });
                }
            })
        );
    }
});