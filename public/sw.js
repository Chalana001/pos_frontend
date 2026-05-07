const CACHE_NAME = "pos-shell-v2";
const RUNTIME_CACHE = "pos-runtime-v2";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pos-shell-") || key.startsWith("pos-runtime-"))
          .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          const cache = await caches.open(CACHE_NAME);
          cache.put("/index.html", networkResponse.clone());
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return cache.match("/index.html");
        })
    );
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.destination === "document") {
          const cache = await caches.open(CACHE_NAME);
          return cache.match("/index.html");
        }

        throw new Error(`Network request failed for ${event.request.url}`);
      })
  );
});
