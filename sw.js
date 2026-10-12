// DEMIURGOS – service worker: prima la rete (così gli aggiornamenti arrivano), poi la copia salvata (funziona anche senza connessione)
const V = 'demiurgos-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const n = await fetch(r);
      if (n && n.ok) c.put(r, n.clone());
      return n;
    } catch (x) {
      const m = (await c.match(r)) || (await c.match('./index.html'));
      if (m) return m;
      throw x;
    }
  })());
});
