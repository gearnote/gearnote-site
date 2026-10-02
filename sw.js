// GEARNOTE service worker — minimal, just enough for PWA installability + a fast repeat-visit shell.
// Network-first for HTML, CSS and JS (the site redeploys every few days, so returning visitors must
// always get the latest code); cache-first only for assets that truly never change (icons).
const CACHE = "gearnote-shell-v2";
const SHELL = ["/", "/css/style.css", "/js/main.js", "/icon-192.png"];
const NETWORK_FIRST_EXT = [".html", ".css", ".js"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);
  const isNavigate = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  const isNetworkFirst = isNavigate || NETWORK_FIRST_EXT.some((ext) => url.pathname.endsWith(ext));

  if (isNetworkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
    )
  );
});
