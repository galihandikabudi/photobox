// GET /d/:id  — halaman unduh yang dibuka tamu setelah scan QR
import { stripExpiry } from '../_lib/common.js';
const ID_RE = /^[a-hj-km-np-z2-9]{10}$/;

const STYLE = `
  :root{--navy:#0E1745;--dark:#1B2E6E;--accent:#F28C00;--accent2:#FFB13D;--cream:#fff8e7}
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;color:var(--cream);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    background:radial-gradient(600px 400px at 90% -5%,rgba(26,111,232,.5),transparent 70%),linear-gradient(180deg,#1B2E6E,#0E1745) fixed;
    display:flex;flex-direction:column;align-items:center;gap:18px;padding:22px 16px 44px;text-align:center}
  header{display:flex;align-items:center;gap:10px}
  header img{width:36px;height:36px;border-radius:10px}
  .badge{color:var(--accent2);font-weight:800;letter-spacing:2px;font-size:12px}
  h1{font-size:28px;font-weight:800;line-height:1.2}
  .lead{opacity:.85;font-size:14.5px;margin-top:-8px}
  .photo{padding:8px;background:rgba(255,255,255,.95);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .photo img{display:block;width:auto;height:auto;max-width:min(260px,68vw);max-height:50vh;border-radius:8px}
  .btns{display:flex;flex-direction:column;gap:12px;width:min(340px,86vw)}
  a.btn,button{display:flex;align-items:center;justify-content:center;gap:10px;font:inherit;font-weight:800;font-size:17px;padding:16px;border-radius:14px;border:0;
    background:linear-gradient(180deg,var(--accent2),var(--accent));color:var(--navy);text-decoration:none;cursor:pointer;box-shadow:0 10px 26px rgba(242,140,0,.3)}
  a.btn svg,button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  button.ghost{background:rgba(255,255,255,.08);color:var(--cream);border:1px solid rgba(255,255,255,.28);box-shadow:none}
  p.note{font-size:13px;opacity:.72;max-width:340px;line-height:1.5}
  footer{font-size:12px;opacity:.55;margin-top:6px}
  [hidden]{display:none!important}
`;

function shell(title, body, status = 200) {
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet"><style>${STYLE}</style></head>
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
    `<header><img src="/icon-192.png" alt=""><div class="badge">SMK MUHAMMADIYAH TODANAN</div></header>
     <h1>Foto belum tersedia</h1>
     <p class="note">Jika kamu baru saja berfoto, fotonya mungkin masih diunggah (internet di lokasi sedang lambat). Halaman ini memeriksa ulang otomatis setiap 10 detik. Jika tidak muncul juga, link ini salah atau fotonya sudah dihapus otomatis.</p>
     <script>(function(){var k='n'+location.pathname,n=0;try{n=+sessionStorage.getItem(k)||0;sessionStorage.setItem(k,n+1)}catch(e){}if(n<90)setTimeout(function(){location.reload()},10000)})()</script>`,
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

  const expires = new Date(stripExpiry(head, env));
  if (Date.now() > expires.getTime()) return missing();

  const src = `/api/photo/${id}`;
  const body = `
    <header><img src="/icon-192.png" alt=""><div class="badge">SMK MUHAMMADIYAH TODANAN</div></header>
    <h1>Foto kamu siap!</h1>
    <p class="lead">Terima kasih sudah berfoto di Photobox.</p>
    <div class="photo"><img src="${src}" alt="Strip foto"></div>
    <div class="btns">
      <a class="btn" href="${src}?dl=1" download><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Unduh Foto</a>
      <button id="share" class="ghost" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 11l6.6-3.7M8.2 13l6.6 3.7"/></svg>Bagikan</button>
    </div>
    <p class="note">Foto akan dihapus otomatis pada ${formatDate(expires)}. Simpan ke galeri sebelum tanggal itu ya.</p>
    <footer>MUHADA BERDAYA · #SMKMuhada</footer>
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
