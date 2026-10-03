// GET /api/wall/:token — foto terbaru sebuah acara untuk layar tayang (TV/proyektor). Token album = kunci akses.
import { json, TOKEN_RE, ALBUM_PREFIX, readEvent, listStrips } from '../../_lib/common.js';

export async function onRequestGet({ params, env }) {
  const token = String(params.token || '');
  if (!TOKEN_RE.test(token) || !env.PHOTOS) return json({ error: 'Layar tayang tidak ditemukan.' }, 404);
  const mark = await env.PHOTOS.head(ALBUM_PREFIX + token);
  const evId = mark && mark.customMetadata && mark.customMetadata.event;
  const ev = evId ? await readEvent(env, evId) : null;
  if (!ev || ev.albumToken !== token) return json({ error: 'Layar tayang tidak ditemukan.' }, 404);

  const now = Date.now();
  const mine = (await listStrips(env)).filter((s) => s.event === ev.id && s.expires > now).sort((a, b) => b.uploaded - a.uploaded);
  const items = mine.slice(0, 40).map((s) => ({ id: s.id, t: s.uploaded, layout: s.layout }));
  return json({
    event: { name: ev.name, title: ev.title || '', brandLine: ev.brandLine || '', welcome: ev.welcome || '', bgColor: ev.bgColor || '', styles: ev.styles || {} },
    total: mine.length, items
  }, 200, { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'public, max-age=3' });
}
