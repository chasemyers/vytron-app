// super-simple cache for offline & faster loads
const CACHE = "vytron-v1";
const ASSETS = [
  "/vytron-app/",
  "/vytron-app/index.html",
  "/vytron-app/equip.html",
  "/vytron-app/inventory.html",
  "/vytron-app/pm.html",
  "/vytron-app/style.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // network-first for Firestore/API; cache-first for our pages/assets
  if (req.method !== "GET" || req.url.includes("firestore.googleapis.com")) return;
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => hit) // offline fallback if we had it
    )
  );
});
