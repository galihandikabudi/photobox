// GET /api/photo/:id        -> menampilkan foto
// GET /api/photo/:id?dl=1   -> mengunduh foto
const ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

function notFound() {
  return new Response('Foto tidak ditemukan atau sudah kedaluwarsa.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  });
}

export async function onRequestGet({ params, request, env, waitUntil }) {
  const id = String(params.id || '');
  if (!ID_RE.test(id) || !env.PHOTOS) return notFound();

  const key = `strips/${id}.jpg`;
  const obj = await env.PHOTOS.get(key);
  if (!obj) return notFound();

  const days = Number(env.RETENTION_DAYS || 7);
  if (Date.now() - obj.uploaded.getTime() > days * 86400000) {
    if (waitUntil) waitUntil(env.PHOTOS.delete(key));
    return notFound();
  }

  const headers = new Headers({
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=3600',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff'
  });
  if (new URL(request.url).searchParams.has('dl')) {
    headers.set('Content-Disposition', `attachment; filename="photobox-muhada-${id}.jpg"`);
  }
  return new Response(obj.body, { headers });
}
