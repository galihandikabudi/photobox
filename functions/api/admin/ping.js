// GET /api/admin/ping — memeriksa kata sandi admin
import { json, requireAdmin } from '../../_lib/common.js';

export async function onRequestGet({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  return json({ ok: true });
}
