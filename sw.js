// DEMIOURGÓS – service worker: pagina = prima la rete (arrivano gli aggiornamenti), poi la copia salvata; clip animate = prima la copia salvata (istantanee)
const V = 'demiurgos-v72', CC = 'demiurgos-clips12';
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
  if (/\.(mp4|mp3|m4a)$/i.test(u.pathname)) return; // video: niente cache del service worker (servono le richieste a intervalli)
  if (u.pathname.includes('/clips/') || u.pathname.includes('/cards/') || u.pathname.includes('/hr/')) {
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
      const n = await fetch(r, {cache: 'no-cache'});
      if (n && n.ok) c.put(r, n.clone());
      return n;
    } catch (x) {
      const m = (await c.match(r)) || (await c.match('./index.html'));
      if (m) return m;
      throw x;
    }
  })());
});

// ===== notifiche push (turno, chat, fine partita) =====
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'AETERNA', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'AETERNA', {
      body: d.body || '', icon: './icon-192.png', badge: './icon-192.png',
      tag: d.tag || 'aeterna', renotify: true, data: { room: d.room || '' }, vibrate: [120, 60, 120]
    });
    try {
      const n = (await self.registration.getNotifications()).length;
      if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(n || 1);
    } catch (x) {}
    // app aperta e visibile: la notifica sparisce subito (non serve duplicarla)
    try {
      const cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (cl.some(c => c.visibilityState === 'visible')) {
        await new Promise(r => setTimeout(r, 1800));
        (await self.registration.getNotifications({ tag: d.tag })).forEach(n => n.close());
        if (self.navigator && self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
      }
    } catch (x) {}
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const room = (e.notification.data && e.notification.data.room) || '';
  e.waitUntil((async () => {
    try { if (self.navigator && self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch (x) {}
    const cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cl.length) { const c = cl[0]; try { await c.focus(); } catch (x) {} if (room) c.postMessage({ t: 'room', room }); return; }
    await self.clients.openWindow('./' + (room ? '?rientra=' + room : ''));
  })());
});
