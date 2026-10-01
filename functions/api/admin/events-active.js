// PUT /api/admin/events-active  {id: "<acara>" | null} — pilih acara yang aktif di kiosk
import { json, requireAdmin, readEvent, ACTIVE_KEY } from '../../_lib/common.js';

export async function onRequestPut({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  if (body.id === null) {
    await env.PHOTOS.delete(ACTIVE_KEY);
    return json({ active: null });
  }
  const ev = await readEvent(env, body.id);
  if (!ev) return json({ error: 'Acara tidak ditemukan.' }, 404);
  await env.PHOTOS.put(ACTIVE_KEY, JSON.stringify({ id: ev.id }), { httpMetadata: { contentType: 'application/json' } });
  return json({ active: ev.id });
}
