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
  return json({ event: { name: ev.name, welcome: ev.welcome, retentionDays: ev.retentionDays, created: ev.created }, items },
    200, { 'X-Robots-Tag': 'noindex, nofollow' });
}
