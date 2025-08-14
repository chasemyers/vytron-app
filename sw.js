// sw.js
const VERSION = 'v5';                  // bump this any time you deploy
const STATIC_CACHE = `static-${VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/inventory.html', '/equip.html', '/pm.html', '/repairs.html',
  '/styles.css', '/inventory.js', '/equip.js', '/pm.js', '/repairs.js',
  // add other static assets here as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for HTML; cache-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        // Optionally cache static assets
        if (req.method === 'GET' && res.ok) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }))
    );
  }
});
