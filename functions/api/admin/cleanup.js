// POST /api/admin/cleanup — hapus semua foto yang sudah melewati masa simpannya
import { json, requireAdmin, listStrips } from '../../_lib/common.js';

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  const now = Date.now();
  const old = (await listStrips(env)).filter((s) => s.expires < now).map((s) => `strips/${s.id}.jpg`);
  for (let i = 0; i < old.length; i += 500) await env.PHOTOS.delete(old.slice(i, i + 500));
  return json({ ok: true, deleted: old.length });
}
