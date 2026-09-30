// PUT /api/admin/settings  {hideBuiltin: boolean}  — pengaturan tampilan kiosk
import { SETTINGS_KEY, json, requireAdmin } from '../../_lib/common.js';

export async function onRequestPut({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON tidak valid.' }, 400); }
  if (typeof body.hideBuiltin !== 'boolean') return json({ error: 'hideBuiltin harus true atau false.' }, 400);

  const settings = { hideBuiltin: body.hideBuiltin };
  await env.PHOTOS.put(SETTINGS_KEY, JSON.stringify(settings), {
    httpMetadata: { contentType: 'application/json' }
  });
  return json(settings);
}
