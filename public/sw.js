/* Service worker kiosk: halaman, font, dan daftar desain tetap tersedia saat internet putus.
   Unggahan foto TIDAK ditangani di sini (antrean offline ada di index.html). */
const CACHE = 'photobox-v1';
const PRECACHE = ['/', '/fonts/fonts.css', '/vendor/qrcode.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const networkFirst = async (req, ms) => {
  const cache = await caches.open(CACHE);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(req, { signal: ctl.signal });
    clearTimeout(t);
    if (r && r.ok) cache.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) return hit;
    throw e;
  }
};
const staleWhileRevalidate = async (req) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/api/admin') || p.startsWith('/admin') || p.startsWith('/a/') || p.startsWith('/d/') || p.startsWith('/api/album') || p.startsWith('/api/photo') || p === '/api/upload') return;
  if (req.mode === 'navigate' && (p === '/' || p === '/index.html')) { e.respondWith(networkFirst(new Request('/'), 3500)); return; }
  if (p === '/api/backgrounds' || p.startsWith('/api/bg/')) { e.respondWith(networkFirst(req, 4000)); return; }
  if (p.startsWith('/fonts/') || p.startsWith('/vendor/') || /\.(png|webmanifest|jpg|svg|woff2)$/.test(p)) { e.respondWith(staleWhileRevalidate(req)); }
});
