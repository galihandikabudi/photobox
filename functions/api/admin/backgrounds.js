// POST /api/admin/backgrounds?name=...&type=latar|frame&text=0|1&layout=strip4|strip3|strip2|grid4|grid6  — unggah gambar desain (isi berkas = body)
import { BG_PREFIX, MAX_BG_BYTES, cleanLayout, json, newBgId, requireAdmin, sniffImage, toItem } from '../../_lib/common.js';

export async function onRequestPost({ request, env }) {
  const deny = await requireAdmin(request, env);
  if (deny) return deny;
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  const url = new URL(request.url);
  const name = (url.searchParams.get('name') || '').trim().slice(0, 40) || 'Desain baru';
  const type = url.searchParams.get('type') === 'frame' ? 'frame' : 'latar';
  const showText = url.searchParams.get('text') === '1';
  const layout = cleanLayout(url.searchParams.get('layout'));

  if (Number(request.headers.get('Content-Length') || 0) > MAX_BG_BYTES) {
    return json({ error: 'Gambar terlalu besar (maksimal 8 MB).' }, 413);
  }
  const data = await request.arrayBuffer();
  if (data.byteLength < 16) return json({ error: 'Berkas kosong.' }, 400);
  if (data.byteLength > MAX_BG_BYTES) return json({ error: 'Gambar terlalu besar (maksimal 8 MB).' }, 413);

  const mime = sniffImage(new Uint8Array(data, 0, 16));
  if (!mime) return json({ error: 'Format tidak didukung. Gunakan PNG, JPG, atau WebP.' }, 415);

  const id = newBgId();
  const meta = { name, type, layout, showText: showText ? '1' : '0', created: String(Date.now()) };
  await env.PHOTOS.put(BG_PREFIX + id, data, {
    httpMetadata: { contentType: mime },
    customMetadata: meta
  });
  return json(toItem({ key: BG_PREFIX + id, customMetadata: meta }), 201);
}
