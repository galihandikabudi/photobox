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

export function toItem(o) {
  const id = o.key.slice(BG_PREFIX.length);
  const m = o.customMetadata || {};
  return {
    id,
    name: m.name || 'Desain',
    type: m.type === 'frame' ? 'frame' : 'latar',
    showText: m.showText === '1',
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
