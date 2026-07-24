/* ==========================================================
   SKYCAST SERVICE WORKER (PWA & Offline Caching Engine)
   ========================================================== */

const CACHE_NAME = "skycast-pwa-v1";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/css/style.css",
    "/css/card.css",
    "/css/animation.css",
    "/css/responsive.css",
    "/js/app.js",
    "/js/helpers.js",
    "/js/theme.js",
    "/js/voice.js"
];

// Install event - Pre-cache application shell assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SkyCast SW] Pre-caching static app shell");
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate event - Purge legacy cache stores
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[SkyCast SW] Deleting obsolete cache:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network First with Cache Fallback for APIs; Stale-While-Revalidate for Static Assets
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Ignore non-GET requests or chrome-extension schemes
    if (request.method !== "GET" || !request.url.startsWith("http")) return;

    // API & Weather requests: Network First -> Cache Fallback
    if (request.url.includes("/api/") || request.url.includes("openweathermap")) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
