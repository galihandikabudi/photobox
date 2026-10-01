// GET /api/admin/strips?offset=0&limit=48  — daftar foto strip tamu (terbaru dulu)
import { json, requireAdmin, listStrips } from '../../_lib/common.js';


export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '48', 10) || 48));

  const evFilter = url.searchParams.get('event');   // id acara, "none" = tanpa acara, kosong = semua
  let all = await listStrips(env);
  if (evFilter) all = all.filter((x) => (evFilter === 'none' ? x.event === '' : x.event === evFilter));

  all.sort((a, b) => b.uploaded - a.uploaded);
  const now = Date.now();
  const items = all.slice(offset, offset + limit).map((x) => ({ ...x, expired: now > x.expires }));
  const totalBytes = all.reduce((n, x) => n + x.size, 0);
  return json({ items, total: all.length, totalBytes, capped: false });
}
