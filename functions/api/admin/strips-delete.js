// POST /api/admin/strips-delete  {ids: ["abc...", ...]}  — hapus foto strip terpilih (maks. 500 per permintaan)
import { json, requireAdmin } from '../../_lib/common.js';

const ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  const ids = Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.length === 0) return json({ error: 'Tidak ada foto yang dipilih.' }, 400);
  if (ids.length > 500) return json({ error: 'Maksimal 500 foto per permintaan.' }, 400);
  const keys = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return json({ error: 'ID foto tidak valid.' }, 400);
    keys.push(`strips/${id}.jpg`);
  }
  await env.PHOTOS.delete(keys);
  return json({ ok: true, deleted: keys.length });
}
