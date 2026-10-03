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
// filter kamera (id harus sama dengan di kiosk dan admin)
export const FILTER_IDS = ['none', 'bw', 'vintage', 'warm', 'cool', 'vivid', 'soft', 'drama'];
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

// Font teks layar awal (di-host sendiri di /fonts). id -> nama keluarga CSS
export const FONTS = {
  jakarta: 'Plus Jakarta Sans', poppins: 'Poppins', montserrat: 'Montserrat', playfair: 'Playfair Display',
  lobster: 'Lobster', pacifico: 'Pacifico', bebas: 'Bebas Neue', oswald: 'Oswald',
  dancing: 'Dancing Script', fredoka: 'Fredoka', caveat: 'Caveat'
};
export const STYLE_KEYS = ['brandLine', 'badge', 'title', 'sub', 'strip'];

// Gaya per teks layar awal: {font, size (0.5-2), color (#rrggbb), bold, italic}; nilai kosong/null = bawaan.
export function cleanStyles(v) {
  const out = {};
  const src = v && typeof v === 'object' ? v : {};
  for (const k of STYLE_KEYS) {
    const o = src[k] && typeof src[k] === 'object' ? src[k] : {};
    const st = {};
    if (typeof o.font === 'string' && FONTS[o.font]) st.font = o.font;
    const sz = Number(o.size);
    if (Number.isFinite(sz) && sz > 0) st.size = Math.round(Math.min(2, Math.max(0.5, sz)) * 100) / 100;
    if (typeof o.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.color)) st.color = o.color.toLowerCase();
    if (typeof o.bold === 'boolean') st.bold = o.bold;
    if (typeof o.italic === 'boolean') st.italic = o.italic;
    if (Object.keys(st).length) out[k] = st;
  }
  return out;
}

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
    // filter kamera yang ditawarkan di kiosk (kosong = semua) dan filter awal ('' = Asli)
    filters: Array.isArray(raw.filters ?? defaults.filters)
      ? FILTER_IDS.filter((x) => (raw.filters ?? defaults.filters).includes(x))
      : [],
    defaultFilter: (() => { const f = raw.defaultFilter ?? defaults.defaultFilter; return FILTER_IDS.includes(f) && f !== 'none' ? f : ''; })(),
    // teks layar awal & strip (kosong = teks bawaan)
    title: txt(raw.title ?? defaults.title, 24),
    brandLine: txt(raw.brandLine ?? defaults.brandLine, 40),
    badge: txt(raw.badge ?? defaults.badge, 40),
    stripLine1: txt(raw.stripLine1 ?? defaults.stripLine1, 40),
    stripTitle: txt(raw.stripTitle ?? defaults.stripTitle, 20),
    stripFooter1: txt(raw.stripFooter1 ?? defaults.stripFooter1, 30),
    stripFooter2: txt(raw.stripFooter2 ?? defaults.stripFooter2, 30),
    styles: cleanStyles(raw.styles ?? defaults.styles),
    // warna latar layar kiosk (#rrggbb; kosong = bawaan)
    bgColor: (() => { const c = raw.bgColor ?? defaults.bgColor; return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : ''; })(),
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
      const m = o.customMetadata || {};
      const taken = Number(m.taken);
      all.push({
        id, size: o.size, uploaded: Number.isFinite(taken) && taken > 0 ? taken : new Date(o.uploaded).getTime(),
        expires: stripExpiry(o, env), event: m.event || '', layout: m.layout || '', design: m.design || ''
      });
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor && all.length < max);
  return all;
}


/* ---------------- Penyimpanan: batas, peringatan, hapus otomatis ---------------- */
export const STORAGE_CFG_KEY = 'settings/storage.json';
export const CLEAN_MARK_KEY = 'settings/_lastclean';
const DEFAULT_STORAGE = { quotaMB: 10240, warnPct: 80, autoOldest: false };   // 10 GB = kuota gratis R2

export function cleanStorageCfg(v) {
  const o = v && typeof v === 'object' ? v : {};
  const q = Number(o.quotaMB), w = Number(o.warnPct);
  return {
    quotaMB: Number.isFinite(q) ? Math.min(10485760, Math.max(100, Math.round(q))) : DEFAULT_STORAGE.quotaMB,
    warnPct: Number.isFinite(w) ? Math.min(95, Math.max(50, Math.round(w))) : DEFAULT_STORAGE.warnPct,
    autoOldest: !!o.autoOldest
  };
}

export async function readStorageCfg(env) {
  try {
    const o = await env.PHOTOS.get(STORAGE_CFG_KEY);
    return o ? cleanStorageCfg(JSON.parse(await o.text())) : cleanStorageCfg(null);
  } catch (e) { return cleanStorageCfg(null); }
}

// Menghitung pemakaian bucket per kelompok. Hanya membaca daftar objek (tanpa mengunduh isi).
export async function measureStorage(env, cfg) {
  const groups = { strips: { count: 0, bytes: 0 }, designs: { count: 0, bytes: 0 }, other: { count: 0, bytes: 0 } };
  let cursor;
  do {
    const res = await env.PHOTOS.list({ cursor, limit: 1000 });
    for (const o of res.objects) {
      const g = o.key.startsWith('strips/') ? groups.strips : (o.key.startsWith('backgrounds/') && !o.key.endsWith('.json')) ? groups.designs : groups.other;
      g.count++; g.bytes += o.size;
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  const used = groups.strips.bytes + groups.designs.bytes + groups.other.bytes;
  const quota = cfg.quotaMB * 1048576;
  const pct = quota ? Math.round((used / quota) * 1000) / 10 : 0;
  const level = pct >= 95 ? 'critical' : pct >= cfg.warnPct ? 'warn' : 'ok';
  return { used, quota, pct, level, groups };
}

// Hapus otomatis: (1) foto yang sudah kedaluwarsa; (2) bila diaktifkan dan pemakaian >= 95%, foto terlama
// sampai pemakaian turun ke 85%. Dibatasi sekali per 10 menit agar hemat operasi baca.
export async function autoCleanup(env, force = false) {
  const mark = await env.PHOTOS.head(CLEAN_MARK_KEY);
  const last = mark ? Number(mark.customMetadata && mark.customMetadata.t) : 0;
  if (!force && last && Date.now() - last < 600000) return { skipped: true };
  await env.PHOTOS.put(CLEAN_MARK_KEY, '', { customMetadata: { t: String(Date.now()) } });
  const cfg = await readStorageCfg(env);
  const now = Date.now();
  let strips = await listStrips(env);
  const expired = strips.filter((s) => s.expires < now);
  let freed = 0, deleted = 0, deletedOldest = 0;
  for (let i = 0; i < expired.length; i += 500) await env.PHOTOS.delete(expired.slice(i, i + 500).map((s) => `strips/${s.id}.jpg`));
  expired.forEach((s) => { freed += s.size; deleted++; });
  if (cfg.autoOldest) {
    const m = await measureStorage(env, cfg);
    if (m.pct >= 95) {
      const target = cfg.quotaMB * 1048576 * 0.85;
      let used = m.used;
      const oldest = strips.filter((s) => s.expires >= now).sort((a, b) => a.uploaded - b.uploaded);
      const del = [];
      for (const s of oldest) { if (used <= target) break; del.push(s); used -= s.size; }
      for (let i = 0; i < del.length; i += 500) await env.PHOTOS.delete(del.slice(i, i + 500).map((s) => `strips/${s.id}.jpg`));
      del.forEach((s) => { freed += s.size; deletedOldest++; });
    }
  }
  return { deleted, deletedOldest, freed };
}
