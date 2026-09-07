// sw.js
// Service worker for "May & Jay". Keeps the app shell (HTML/CSS/JS/icons)
// available offline and speeds up repeat visits, while leaving /api/*
// requests alone — the shared library is live data and should never be
// served from a stale cache.

const CACHE_VERSION = 'mj-v1';
const SHELL_CACHE = `mj-shell-${CACHE_VERSION}`;

const SHELL_URLS = [
    '/',
    '/index.html',
    '/login.html',
    '/style.css',
    '/script.js',
    '/data.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-192-maskable.png',
    '/icons/icon-512-maskable.png',
    '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_URLS))
            .catch((e) => console.warn('SW: shell precache failed', e))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((name) => name.startsWith('mj-shell-') && name !== SHELL_CACHE)
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

function isApiRequest(url) {
    return url.pathname.startsWith('/api/');
}

// Network-first for page navigations, so logged-in users always see the
// latest shell when online, but still get something if they're offline.
async function handleNavigate(request) {
    try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
    } catch (e) {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request) || await cache.match('/index.html');
        if (cached) return cached;
        throw e;
    }
}

// Stale-while-revalidate for static assets: instant response from cache
// when we have one, with a silent background refresh for next time.
async function handleAsset(request) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    const networkFetch = fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);
    return cached || (await networkFetch) || Response.error();
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (isApiRequest(url)) return; // always hit the network for live data

    if (request.mode === 'navigate') {
        event.respondWith(handleNavigate(request));
        return;
    }

    if (SHELL_URLS.includes(url.pathname)) {
        event.respondWith(handleAsset(request));
    }
});
