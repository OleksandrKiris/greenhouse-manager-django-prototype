const CACHE_PREFIX = "greenhouse-manager-";
const CACHE_NAME = `${CACHE_PREFIX}2026-08-05-4`;
const CORE = ["./", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async (asset) => {
      try { await cache.add(new Request(asset, { cache: "reload" })); }
      catch (_) { /* An optional asset must not block installation. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function remember(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function cached(request, fallback = null) {
  const direct = await caches.match(request, { ignoreSearch: true });
  if (direct) return direct;
  return fallback ? caches.match(fallback, { ignoreSearch: true }) : null;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        await remember(request, response);
        return response;
      } catch (_) {
        return await cached(request, "./") || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const fromCache = await cached(request);
    if (fromCache) {
      fetch(request).then((response) => remember(request, response)).catch(() => {});
      return fromCache;
    }
    try {
      const response = await fetch(request);
      await remember(request, response);
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
