/*
 * Space Explorer 3D service worker: makes the game playable offline after
 * the first visit. Bump VERSION when files with fixed names (textures, icons)
 * change so players get the new ones.
 */
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;

/** Hashed build files and fixed game assets never change under the same URL. */
const CACHE_FIRST = [/^\/_next\/static\//, /^\/textures\//, /^\/icons\//];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then((cache) => cache.addAll(["/"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PAGES && key !== ASSETS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only this site's files: account sync and other services always go to the network.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Fresh page when online, the cached one when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (CACHE_FIRST.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
