// GET /d/:id  — halaman unduh yang dibuka tamu setelah scan QR
const ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

const STYLE = `
  :root{--green:#0b6b44;--dark:#073d27;--gold:#f2b632;--cream:#fff8e7}
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;background:radial-gradient(circle at 50% 0,var(--green),var(--dark) 75%);color:var(--cream);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;
    gap:16px;padding:24px 16px 40px;text-align:center}
  .badge{color:var(--gold);font-weight:700;letter-spacing:2px;font-size:13px}
  h1{font-size:26px}
  img{max-width:min(320px,80vw);width:100%;height:auto;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.45)}
  .btns{display:flex;flex-direction:column;gap:12px;width:min(320px,80vw)}
  a.btn,button{display:block;font:inherit;font-weight:800;font-size:18px;padding:16px;border-radius:999px;border:0;
    background:var(--gold);color:var(--dark);text-decoration:none;cursor:pointer}
  button.ghost{background:transparent;color:var(--cream);border:2px solid rgba(255,248,231,.55)}
  p.note{font-size:13px;opacity:.75;max-width:320px;line-height:1.45}
  [hidden]{display:none!important}
`;

function shell(title, body, status = 200) {
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title><style>${STYLE}</style></head>
<body>${body}</body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

function missing() {
  return shell(
    'Foto tidak ditemukan',
    `<div class="badge">SMK MUHAMMADIYAH TODANAN</div>
     <h1>Foto tidak ditemukan</h1>
     <p class="note">Link ini salah atau fotonya sudah dihapus otomatis. Silakan foto lagi di photobox.</p>`,
    404
  );
}

function formatDate(date) {
  try {
    return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

export async function onRequestGet({ params, env }) {
  const id = String(params.id || '');
  if (!ID_RE.test(id) || !env.PHOTOS) return missing();

  const head = await env.PHOTOS.head(`strips/${id}.jpg`);
  if (!head) return missing();

  const days = Number(env.RETENTION_DAYS || 7);
  const expires = new Date(head.uploaded.getTime() + days * 86400000);
  if (Date.now() > expires.getTime()) return missing();

  const src = `/api/photo/${id}`;
  const body = `
    <div class="badge">SMK MUHAMMADIYAH TODANAN</div>
    <h1>Foto kamu siap!</h1>
    <img src="${src}" alt="Strip foto">
    <div class="btns">
      <a class="btn" href="${src}?dl=1" download>Unduh Foto</a>
      <button id="share" class="ghost" hidden>Bagikan</button>
    </div>
    <p class="note">Foto akan dihapus otomatis pada ${formatDate(expires)}. Simpan ke galeri sebelum tanggal itu ya.</p>
    <script>
      (function () {
        var btn = document.getElementById('share');
        if (!navigator.canShare || !navigator.share) return;
        btn.hidden = false;
        btn.onclick = function () {
          fetch('${src}').then(function (r) { return r.blob(); }).then(function (b) {
            var f = new File([b], 'photobox-muhada.jpg', { type: 'image/jpeg' });
            if (navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: 'Photobox SMK Muhada' });
            return navigator.share({ url: location.href });
          }).catch(function () {});
        };
      })();
    </script>`;
  return shell('Foto Photobox SMK Muhada', body);
}
