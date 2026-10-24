// Service worker: offline mode + update detection.
// The version comes from version.js – a new number there = a new release for all users.
importScripts("version.js");
const CACHE = "quaderno-" + self.APP_VERSION, FONTS = "quaderno-fonts";

// Core files cached on install. Other files (JS modules, icons) are cached on first use.
const CORE = ["./", "./index.html", "./version.js", "./css/style.css", "./js/main.js",
  "./data/words.json", "./data/verbs.json", "./data/changelog.json", "./manifest.webmanifest", "./icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("quaderno-") && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page asks for the new version only after the user taps "Refresh"
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(caches.match("./index.html").then(hit => hit || fetch(r))); return; }
  // Cache first; anything not cached yet is fetched fresh and stored in this version's cache
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(r, { cache: "no-cache" });
    if (res.ok) c.put(r, res.clone());
    return res;
  }));
});
