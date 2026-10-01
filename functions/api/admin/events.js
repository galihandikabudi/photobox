// GET  /api/admin/events  — daftar acara (+ jumlah foto) dan acara aktif
// POST /api/admin/events  {name, retentionDays?, welcome?, designIds?, hideBuiltin?} — buat acara
import { json, requireAdmin, listEvents, writeEvent, cleanEvent, randomString, listStrips, getActiveEvent } from '../../_lib/common.js';

export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);
  const [events, strips, active] = await Promise.all([listEvents(env), listStrips(env), getActiveEvent(env)]);
  const counts = {};
  const bytes = {};
  for (const s of strips) {
    counts[s.event] = (counts[s.event] || 0) + 1;
    bytes[s.event] = (bytes[s.event] || 0) + s.size;
  }
  return json({
    active: active ? active.id : null,
    noEvent: { count: counts[''] || 0, bytes: bytes[''] || 0 },
    events: events.map((e) => ({ ...e, count: counts[e.id] || 0, bytes: bytes[e.id] || 0 }))
  });
}

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  if (!String(body.name || '').trim()) return json({ error: 'Nama acara wajib diisi.' }, 400);
  const ev = cleanEvent({ ...body, id: randomString(8), albumToken: randomString(20), created: Date.now() }, { retentionDays: 7 });
  await writeEvent(env, ev);
  return json(ev, 201);
}
