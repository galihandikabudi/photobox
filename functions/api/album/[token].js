// GET /api/album/:token — daftar foto sebuah acara untuk penyelenggara (token rahasia)
import { json, TOKEN_RE, ALBUM_PREFIX, readEvent, listStrips } from '../../_lib/common.js';

export async function onRequestGet({ params, env }) {
  const token = String(params.token || '');
  if (!TOKEN_RE.test(token) || !env.PHOTOS) return json({ error: 'Album tidak ditemukan.' }, 404);
  const mark = await env.PHOTOS.head(ALBUM_PREFIX + token);
  const evId = mark && mark.customMetadata && mark.customMetadata.event;
  const ev = evId ? await readEvent(env, evId) : null;
  if (!ev || ev.albumToken !== token) return json({ error: 'Album tidak ditemukan.' }, 404);

  const now = Date.now();
  const items = (await listStrips(env))
    .filter((s) => s.event === ev.id && s.expires > now)
    .sort((a, b) => a.uploaded - b.uploaded)
    .map((s) => ({ id: s.id, uploaded: s.uploaded, expires: s.expires, layout: s.layout, design: s.design }));
  // Foto lama (sebelum tata letak dicatat): tebak jenisnya dari rasio gambar JPEG ('strip' 1:3, 'card' 2:3).
  const missing = items.filter((x) => !x.layout).slice(0, 300);
  let k = 0;
  const worker = async () => {
    while (k < missing.length) {
      const it = missing[k++];
      try {
        const o = await env.PHOTOS.get(`strips/${it.id}.jpg`, { range: { offset: 0, length: 16384 } });
        if (!o) continue;
        const d = new Uint8Array(await o.arrayBuffer());
        let i = 2;
        while (i + 9 < d.length) {
          if (d[i] !== 0xff) { i++; continue; }
          const m = d[i + 1];
          if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
            const h = (d[i + 5] << 8) | d[i + 6], w = (d[i + 7] << 8) | d[i + 8];
            if (w && h) it.layout = h / w > 2.2 ? 'strip' : 'card';
            break;
          }
          i += 2 + ((d[i + 2] << 8) | d[i + 3]);
        }
      } catch (e) { /* biarkan tidak tercatat */ }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  return json({ event: { name: ev.name, welcome: ev.welcome, retentionDays: ev.retentionDays, created: ev.created }, items },
    200, { 'X-Robots-Tag': 'noindex, nofollow' });
}
