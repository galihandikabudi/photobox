// GET /api/admin/storage              — pemakaian penyimpanan + pengaturan batas
// PUT /api/admin/storage {quotaMB, warnPct, autoOldest} — simpan pengaturan batas & hapus otomatis
// POST /api/admin/storage             — jalankan hapus otomatis sekarang
import { json, requireAdmin, readStorageCfg, cleanStorageCfg, measureStorage, autoCleanup, STORAGE_CFG_KEY } from '../../_lib/common.js';

export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);
  const cfg = await readStorageCfg(env);
  return json({ cfg, ...(await measureStorage(env, cfg)) });
}

export async function onRequestPut({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  const cfg = cleanStorageCfg(body);
  await env.PHOTOS.put(STORAGE_CFG_KEY, JSON.stringify(cfg), { httpMetadata: { contentType: 'application/json' } });
  return json({ cfg, ...(await measureStorage(env, cfg)) });
}

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);
  const r = await autoCleanup(env, true);
  const cfg = await readStorageCfg(env);
  return json({ ...r, cfg, ...(await measureStorage(env, cfg)) });
}
