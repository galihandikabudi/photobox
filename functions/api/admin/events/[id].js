// PATCH  /api/admin/events/:id            — ubah pengaturan acara
// DELETE /api/admin/events/:id?photos=1   — hapus acara (opsional beserta semua fotonya)
import { json, requireAdmin, readEvent, writeEvent, cleanEvent, randomString, listStrips,
  EVENT_PREFIX, ALBUM_PREFIX, ACTIVE_KEY, getActiveEvent } from '../../../_lib/common.js';

export async function onRequestPatch({ request, params, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  const cur = await readEvent(env, params.id);
  if (!cur) return json({ error: 'Acara tidak ditemukan.' }, 404);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  const merged = { ...cur };
  for (const k of ['name', 'welcome', 'retentionDays', 'designIds', 'hideBuiltin', 'layouts', 'title', 'brandLine', 'badge', 'stripLine1', 'stripTitle', 'stripFooter1', 'stripFooter2']) if (k in body) merged[k] = body[k];
  const next = cleanEvent(merged, cur);
  if (body.newAlbumLink === true) {
    await env.PHOTOS.delete(ALBUM_PREFIX + cur.albumToken);   // tautan lama tidak berlaku lagi
    next.albumToken = randomString(20);
  }
  await writeEvent(env, next);
  return json(next);
}

export async function onRequestDelete({ request, params, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  const cur = await readEvent(env, params.id);
  if (!cur) return json({ error: 'Acara tidak ditemukan.' }, 404);
  const withPhotos = new URL(request.url).searchParams.get('photos') === '1';
  let deleted = 0;
  if (withPhotos) {
    const mine = (await listStrips(env)).filter((s) => s.event === cur.id).map((s) => `strips/${s.id}.jpg`);
    for (let i = 0; i < mine.length; i += 500) await env.PHOTOS.delete(mine.slice(i, i + 500));
    deleted = mine.length;
  }
  const active = await getActiveEvent(env);
  if (active && active.id === cur.id) await env.PHOTOS.delete(ACTIVE_KEY);
  await env.PHOTOS.delete([EVENT_PREFIX + cur.id + '.json', ALBUM_PREFIX + cur.albumToken]);
  return json({ ok: true, deletedPhotos: deleted });
}
