const SHELL = 'arcane-shell-v0.2.0';
const IMAGES = 'arcane-card-images-v0.2.0';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL,IMAGES].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.destination === 'image' && url.hostname.endsWith('scryfall.io')) {
    event.respondWith(caches.open(IMAGES).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (_) {
        return hit || Response.error();
      }
    }));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (url.origin === self.location.origin && res.ok) caches.open(SHELL).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
