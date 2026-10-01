// Fungsi bersama untuk pengelolaan desain strip (latar/frame) yang disimpan di R2.
// Berkas ini tidak mengekspor onRequest*, jadi bukan sebuah rute.

export const BG_PREFIX = 'backgrounds/';
export const SETTINGS_KEY = 'backgrounds/_settings.json';
export const BG_ID_RE = /^[a-z0-9]{12}$/;
export const MAX_BG_BYTES = 8 * 1024 * 1024;

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }
  });
}

export function newBgId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const limit = 256 - (256 % chars.length);
  let out = '';
  while (out.length < 12) {
    const buf = crypto.getRandomValues(new Uint8Array(24));
    for (const b of buf) {
      if (b < limit && out.length < 12) out += chars[b % chars.length];
    }
  }
  return out;
}

// Mengembalikan null jika kata sandi benar, atau Response error jika tidak.
export async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'ADMIN_PASSWORD belum diatur di Cloudflare Pages.' }, 503);
  }
  const auth = request.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(String(env.ADMIN_PASSWORD)))
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]; // perbandingan waktu-tetap
  if (diff !== 0) return json({ error: 'Kata sandi salah.' }, 401);
  return null;
}

// Menentukan jenis gambar dari byte awal (bukan dari header yang dikirim klien). SVG sengaja tidak diizinkan.
export function sniffImage(u8) {
  if (u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return 'image/png';
  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'image/jpeg';
  if (
    u8.length >= 12 &&
    u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 &&
    u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50
  ) return 'image/webp';
  return null;
}

export const LAYOUT_IDS = ['strip4', 'strip3', 'strip2', 'grid4', 'grid6'];
export const cleanLayout = (v) => (LAYOUT_IDS.includes(v) ? v : 'strip4');

export function toItem(o) {
  const id = o.key.slice(BG_PREFIX.length);
  const m = o.customMetadata || {};
  return {
    id,
    name: m.name || 'Desain',
    type: m.type === 'frame' ? 'frame' : 'latar',
    showText: m.showText === '1',
    layout: cleanLayout(m.layout),
    created: Number(m.created) || (o.uploaded ? new Date(o.uploaded).getTime() : 0),
    url: `/api/bg/${id}`
  };
}

export async function readSettings(env) {
  try {
    const o = await env.PHOTOS.get(SETTINGS_KEY);
    if (!o) return { hideBuiltin: false };
    const j = JSON.parse(await o.text());
    return { hideBuiltin: !!j.hideBuiltin };
  } catch (e) {
    return { hideBuiltin: false };
  }
}

/* ---------------- Acara (event) ---------------- */
export const EVENT_PREFIX = 'events/';
export const ACTIVE_KEY = 'events/_active.json';
export const ALBUM_PREFIX = 'albums/';
export const EVENT_ID_RE = /^[a-z0-9]{8}$/;
export const TOKEN_RE = /^[a-z0-9]{20}$/;
export const STRIP_ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

export function randomString(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const limit = 256 - (256 % chars.length);
  let out = '';
  while (out.length < n) {
    const buf = crypto.getRandomValues(new Uint8Array(n * 2));
    for (const b of buf) if (b < limit && out.length < n) out += chars[b % chars.length];
  }
  return out;
}

const txt = (v, n) => String(v ?? '').trim().slice(0, n);

export function cleanEvent(raw, defaults) {
  const days = Number(raw.retentionDays);
  return {
    id: raw.id,
    name: String(raw.name || defaults.name || 'Acara').trim().slice(0, 60) || 'Acara',
    welcome: String(raw.welcome ?? defaults.welcome ?? '').trim().slice(0, 140),
    retentionDays: Number.isFinite(days) ? Math.min(365, Math.max(1, Math.round(days))) : (defaults.retentionDays || 7),
    designIds: Array.isArray(raw.designIds ?? defaults.designIds)
      ? (raw.designIds ?? defaults.designIds).filter((x) => typeof x === 'string' && /^[a-z0-9]{12}$/.test(x)).slice(0, 100)
      : [],
    hideBuiltin: !!(raw.hideBuiltin ?? defaults.hideBuiltin),
    // tata letak yang ditawarkan di kiosk (kosong = strip 4 foto + tata letak desain yang dipilih)
    layouts: Array.isArray(raw.layouts ?? defaults.layouts)
      ? LAYOUT_IDS.filter((x) => (raw.layouts ?? defaults.layouts).includes(x))
      : [],
    // teks layar awal & strip (kosong = teks bawaan)
    title: txt(raw.title ?? defaults.title, 24),
    brandLine: txt(raw.brandLine ?? defaults.brandLine, 40),
    badge: txt(raw.badge ?? defaults.badge, 40),
    stripLine1: txt(raw.stripLine1 ?? defaults.stripLine1, 40),
    stripTitle: txt(raw.stripTitle ?? defaults.stripTitle, 20),
    stripFooter1: txt(raw.stripFooter1 ?? defaults.stripFooter1, 30),
    stripFooter2: txt(raw.stripFooter2 ?? defaults.stripFooter2, 30),
    albumToken: raw.albumToken || defaults.albumToken,
    created: raw.created || defaults.created || Date.now()
  };
}

export async function readEvent(env, id) {
  if (!EVENT_ID_RE.test(String(id))) return null;
  const o = await env.PHOTOS.get(EVENT_PREFIX + id + '.json');
  if (!o) return null;
  try { return cleanEvent(JSON.parse(await o.text()), {}); } catch (e) { return null; }
}

export async function writeEvent(env, ev) {
  await env.PHOTOS.put(EVENT_PREFIX + ev.id + '.json', JSON.stringify(ev), { httpMetadata: { contentType: 'application/json' } });
  // penanda token album -> acara (token rahasia untuk penyelenggara)
  await env.PHOTOS.put(ALBUM_PREFIX + ev.albumToken, '', { customMetadata: { event: ev.id } });
}

export async function listEvents(env) {
  const out = [];
  let cursor;
  do {
    const res = await env.PHOTOS.list({ prefix: EVENT_PREFIX, cursor, limit: 500 });
    for (const o of res.objects) {
      const name = o.key.slice(EVENT_PREFIX.length);
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      const ev = await readEvent(env, name.slice(0, -5));
      if (ev) out.push(ev);
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  out.sort((a, b) => a.created - b.created);
  return out;
}

export async function getActiveEvent(env) {
  try {
    const o = await env.PHOTOS.get(ACTIVE_KEY);
    if (!o) return null;
    const j = JSON.parse(await o.text());
    return j && j.id ? await readEvent(env, j.id) : null;
  } catch (e) { return null; }
}

// Waktu kedaluwarsa (ms) sebuah strip: dari metadata 'expires' bila ada, jika tidak dari RETENTION_DAYS.
export function stripExpiry(obj, env) {
  const m = (obj.customMetadata) || {};
  const e = Number(m.expires);
  if (Number.isFinite(e) && e > 0) return e;
  const days = Number(env.RETENTION_DAYS || 7);
  return new Date(obj.uploaded).getTime() + days * 86400000;
}

// Mengambil semua strip beserta metadata (untuk admin & album).
export async function listStrips(env, max = 20000) {
  const all = [];
  let cursor;
  do {
    const res = await env.PHOTOS.list({ prefix: 'strips/', include: ['customMetadata'], cursor, limit: 1000 });
    for (const o of res.objects) {
      const id = o.key.slice('strips/'.length).replace(/\.jpg$/, '');
      if (!STRIP_ID_RE.test(id)) continue;
      all.push({
        id, size: o.size, uploaded: new Date(o.uploaded).getTime(),
        expires: stripExpiry(o, env), event: (o.customMetadata && o.customMetadata.event) || ''
      });
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor && all.length < max);
  return all;
}
