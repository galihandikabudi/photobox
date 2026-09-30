// GET /api/admin/strips?offset=0&limit=48  — daftar foto strip tamu (terbaru dulu)
import { json, requireAdmin } from '../../_lib/common.js';

const ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '48', 10) || 48));

  const all = [];
  let cursor;
  let pages = 0;
  do {
    const res = await env.PHOTOS.list({ prefix: 'strips/', cursor, limit: 1000 });
    for (const o of res.objects) {
      const id = o.key.slice('strips/'.length).replace(/\.jpg$/, '');
      if (!ID_RE.test(id)) continue;
      all.push({ id, size: o.size, uploaded: new Date(o.uploaded).getTime() });
    }
    cursor = res.truncated ? res.cursor : undefined;
    pages++;
  } while (cursor && pages < 20);   // batas pengaman: maks. 20.000 foto

  all.sort((a, b) => b.uploaded - a.uploaded);
  const days = Number(env.RETENTION_DAYS || 7);
  const now = Date.now();
  const items = all.slice(offset, offset + limit).map((x) => ({
    ...x,
    expired: now - x.uploaded > days * 86400000
  }));
  const totalBytes = all.reduce((n, x) => n + x.size, 0);
  return json({ items, total: all.length, totalBytes, retentionDays: days, capped: !!cursor });
}
