/* eslint-disable no-restricted-globals */
/**
 * Shugela service worker — offline app shell.
 *
 * Strategy
 *  - navigations: network-first, fall back to the cached page (then to "/")
 *  - static assets / RSC payloads: stale-while-revalidate
 *  - everything else is passed straight through
 *
 * Bump CACHE_VERSION on every release so old shells are evicted on activate.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `shugela-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `shugela-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/log",
  "/history",
  "/trends",
  "/settings",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Add individually so one 404 cannot abort the whole install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Offline during install — runtime caching will fill the gap.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("shugela-") && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const network = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (network && network.ok) {
      cache.put(request, network.clone());
      return network;
    }
    if (network) return network;
  } catch {
    // Fall through to the cache.
  }

  const cached = await cache.match(request) || (await cache.match("/"));
  if (cached) return cached;

  return new Response(
    "<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Shugela — offline</title></head>" +
      "<body style='font-family:system-ui;padding:2rem'><h1>You are offline</h1>" +
      "<p>Open Shugela once while connected so it can be installed to your home screen.</p></body></html>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    network.catch(() => undefined);
    return cached;
  }

  const response = await network;
  if (response) return response;

  const shell = await caches.open(SHELL_CACHE);
  const fallback = await shell.match(request);
  if (fallback) return fallback;

  return new Response("", { status: 504, statusText: "Offline" });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}