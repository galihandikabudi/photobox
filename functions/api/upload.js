// POST /api/upload  — menerima strip foto (JPEG), menyimpan ke R2, mengembalikan {id, url}
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // tanpa i, l, o, 0, 1 agar tidak membingungkan
const ID_LENGTH = 10;
const MAX_BYTES = 6 * 1024 * 1024;

function newId() {
  const limit = 256 - (256 % ALPHABET.length); // hindari bias modulo
  let out = '';
  while (out.length < ID_LENGTH) {
    const buf = crypto.getRandomValues(new Uint8Array(ID_LENGTH * 2));
    for (const b of buf) {
      if (b < limit && out.length < ID_LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.PHOTOS) return json({ error: 'Binding R2 "PHOTOS" belum dipasang.' }, 500);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'image/jpeg') return json({ error: 'Hanya menerima image/jpeg.' }, 415);

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BYTES) return json({ error: 'File terlalu besar.' }, 413);

  const data = await request.arrayBuffer();
  if (data.byteLength < 4) return json({ error: 'File kosong.' }, 400);
  if (data.byteLength > MAX_BYTES) return json({ error: 'File terlalu besar.' }, 413);

  const head = new Uint8Array(data, 0, 3);
  if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) {
    return json({ error: 'Berkas bukan JPEG yang valid.' }, 400);
  }

  const id = newId();
  await env.PHOTOS.put(`strips/${id}.jpg`, data, {
    httpMetadata: { contentType: 'image/jpeg' }
  });

  const base = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
  return json({ id, url: `${base}/d/${id}` }, 201);
}

export function onRequest() {
  return json({ error: 'Method not allowed.' }, 405);
}
