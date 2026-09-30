// GET /api/bg/:id — menampilkan gambar desain (publik)
import { BG_PREFIX, BG_ID_RE } from '../../_lib/common.js';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

function notFound() {
  return new Response('Desain tidak ditemukan.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet({ params, env }) {
  const id = String(params.id || '');
  if (!BG_ID_RE.test(id) || !env.PHOTOS) return notFound();

  const obj = await env.PHOTOS.get(BG_PREFIX + id);
  if (!obj) return notFound();

  const type = (obj.httpMetadata && obj.httpMetadata.contentType) || '';
  if (!ALLOWED.includes(type)) return notFound();

  return new Response(obj.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
