// DEMIOURGÓS – service worker: pagina = prima la rete (arrivano gli aggiornamenti), poi la copia salvata; clip animate = prima la copia salvata (istantanee)
const V = 'demiurgos-v28', CC = 'demiurgos-clips7';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const CLIPS = ['G_archeologo_att','G_ingegnere_att','G_ingegnere_dmg','G_ingegnere_down','G_ingegnere_stress','G_scienziato_att','G_sicurezza_att','S_guardiano-risveglio','S_totem-attivato'].map(n => './clips/' + n + '.webp');
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(Promise.all([
    caches.open(V).then(c => c.addAll(FILES)).catch(() => {}),
    caches.open(CC).then(c => Promise.all(CLIPS.map(u => c.add(u).catch(() => {})))).catch(() => {})
  ]));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== CC).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.includes('/clips/')) {
    e.respondWith((async () => {
      const c = await caches.open(CC), m = await c.match(r,{ignoreSearch:true});
      if (m) return m;
      const n = await fetch(r);
      if (n && n.ok) c.put(new Request(u.origin+u.pathname), n.clone());
      return n;
    })());
    return;
  }
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
