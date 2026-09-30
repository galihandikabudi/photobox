// PATCH  /api/admin/backgrounds/:id  {name?, type?, showText?}  — ubah pengaturan desain
// DELETE /api/admin/backgrounds/:id                               — hapus desain
import { BG_PREFIX, BG_ID_RE, json, requireAdmin, toItem } from '../../../_lib/common.js';

function validId(params) {
  const id = String(params.id || '');
  return BG_ID_RE.test(id) ? id : null;
}

export async function onRequestPatch({ request, params, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  const id = validId(params);
  if (!id || !env.PHOTOS) return json({ error: 'Desain tidak ditemukan.' }, 404);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }

  const key = BG_PREFIX + id;
  const obj = await env.PHOTOS.get(key);
  if (!obj) return json({ error: 'Desain tidak ditemukan.' }, 404);

  const meta = { ...(obj.customMetadata || {}) };
  if (typeof body.name === 'string') meta.name = body.name.trim().slice(0, 40) || meta.name || 'Desain';
  if (body.type === 'frame' || body.type === 'latar') meta.type = body.type;
  if (typeof body.showText === 'boolean') meta.showText = body.showText ? '1' : '0';

  // R2 tidak bisa mengubah metadata di tempat, jadi objek ditulis ulang dengan isi yang sama.
  const bytes = await obj.arrayBuffer();
  await env.PHOTOS.put(key, bytes, { httpMetadata: obj.httpMetadata, customMetadata: meta });
  return json(toItem({ key, customMetadata: meta }));
}

export async function onRequestDelete({ request, params, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  const id = validId(params);
  if (!id || !env.PHOTOS) return json({ error: 'Desain tidak ditemukan.' }, 404);
  await env.PHOTOS.delete(BG_PREFIX + id);
  return json({ ok: true });
}
