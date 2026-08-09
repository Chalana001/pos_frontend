const CACHE_NAME = "pos-shell-v3";
const RUNTIME_CACHE = "pos-runtime-v3";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest", "/branding/zensys-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(PRECACHE_URLS.map(async (url) => {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn(`Unable to precache ${url}`, error);
        }
      }));
    })
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

  if (
    requestUrl.pathname.startsWith("/api/")
    || requestUrl.pathname.startsWith("/auth/")
    || requestUrl.pathname.startsWith("/graphql")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          const cache = await caches.open(CACHE_NAME);
          if (networkResponse.ok && networkResponse.headers.get("content-type")?.includes("text/html")) {
            cache.put("/index.html", networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const fallback = await cache.match("/index.html");
          if (fallback) return fallback;
          throw new Error("Offline shell is unavailable");
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
        const contentType = networkResponse.headers.get("content-type") || "";
        const isDataResponse = contentType.includes("application/json") || contentType.includes("text/event-stream");
        if (networkResponse.ok && !isDataResponse) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(event.request, networkResponse.clone());
        }
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
