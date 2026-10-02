import { getActiveEvent, readEvent, EVENT_ID_RE, LAYOUT_IDS, STRIP_ID_RE, autoCleanup } from '../_lib/common.js';

// POST /api/upload[?id=&event=&t=&layout=&design=]  — menerima strip foto (JPEG), menyimpan ke R2, mengembalikan {id, url}
// Parameter opsional dipakai antrean offline kiosk: id dibuat di kiosk (idempoten, unggah ulang aman),
// event & t = acara dan waktu saat foto diambil (bukan saat akhirnya terunggah).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // tanpa i, l, o, 0, 1 agar tidak membingungkan
const ID_LENGTH = 10;
const MAX_BYTES = 6 * 1024 * 1024;

function newId() {
  const limit = 256 - (256 % ALPHABET.length); // hindari bias modulo
  let out = '';
  while (out.length < ID_LENGTH) {
    const buf = crypto.getRandomValues(new Uint8Array(ID_LENGTH * 2));
    for (const b of buf) {
      if (b < limit && out.length < ID_LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'image/jpeg') return json({ error: 'Hanya menerima image/jpeg.' }, 415);

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BYTES) return json({ error: 'File terlalu besar.' }, 413);

  const data = await request.arrayBuffer();
  if (data.byteLength < 4) return json({ error: 'File kosong.' }, 400);
  if (data.byteLength > MAX_BYTES) return json({ error: 'File terlalu besar.' }, 413);

  const head = new Uint8Array(data, 0, 3);
  if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) {
    return json({ error: 'Berkas bukan JPEG yang valid.' }, 400);
  }

  const q = new URL(request.url).searchParams;
  let id = q.get('id') || '';
  if (!STRIP_ID_RE.test(id)) id = newId();
  const base0 = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
  // Unggahan ulang dengan id yang sama (antrean offline): jangan timpa, cukup balas sukses.
  if (q.get('id') === id && await env.PHOTOS.head(`strips/${id}.jpg`)) return json({ id, url: `${base0}/d/${id}`, existed: true }, 200);

  // Foto ditandai dengan acara & waktu pengambilan; masa simpan dihitung dari waktu pengambilan.
  const meta = {};
  const now = Date.now();
  let taken = Number(q.get('t'));
  if (!(Number.isFinite(taken) && taken > now - 30 * 86400000 && taken <= now + 60000)) taken = now;
  try {
    let ev = null;
    const evId = q.get('event') || '';
    if (EVENT_ID_RE.test(evId)) ev = await readEvent(env, evId);
    if (!ev) ev = await getActiveEvent(env);
    if (ev) {
      meta.event = ev.id;
      meta.expires = String(taken + ev.retentionDays * 86400000);
    }
  } catch (e) { /* tanpa acara aktif */ }
  meta.taken = String(Math.round(taken));
  const lay = q.get('layout') || '';
  if (LAYOUT_IDS.includes(lay)) meta.layout = lay;
  const dn = (q.get('design') || '').replace(/[^\p{L}\p{N} _().&-]/gu, '').trim().slice(0, 40);
  if (dn) meta.design = dn;
  await env.PHOTOS.put(`strips/${id}.jpg`, data, {
    httpMetadata: { contentType: 'image/jpeg' },
    customMetadata: meta
  });
  if (waitUntil) waitUntil(autoCleanup(env).catch(() => {}));

  const base = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
  return json({ id, url: `${base}/d/${id}` }, 201);
}

export function onRequest() {
  return json({ error: 'Method not allowed.' }, 405);
}
