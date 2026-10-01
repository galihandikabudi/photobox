// GET /a/:token — halaman album untuk penyelenggara (tautan rahasia, tanpa login)
import { TOKEN_RE } from '../_lib/common.js';

const PAGE = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Album Photobox</title>
<link rel="icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  :root{--navy:#0E1745;--accent:#F28C00;--accent2:#FFB13D;--cream:#fff8e7;--line:rgba(255,255,255,.16)}
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;color:var(--cream);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    background:radial-gradient(700px 400px at 90% -5%,rgba(26,111,232,.5),transparent 70%),linear-gradient(180deg,#1B2E6E,#0E1745) fixed;padding:22px 16px 60px}
  .wrap{max-width:1000px;margin:0 auto}
  header{display:flex;align-items:center;gap:12px;margin-bottom:22px}
  header img{width:40px;height:40px;border-radius:11px}
  .badge{color:var(--accent2);font-weight:800;letter-spacing:2px;font-size:11px}
  h1{font-size:26px;font-weight:800;line-height:1.2}
  .meta{opacity:.78;font-size:14px;margin:6px 0 16px}
  .bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
  button{font:inherit;font-weight:800;font-size:15px;padding:12px 20px;border-radius:12px;border:0;cursor:pointer;color:var(--navy);
    background:linear-gradient(180deg,var(--accent2),var(--accent))}
  button:disabled{opacity:.55;cursor:default}
  .prog{font-size:14px;opacity:.85}
  .err{color:#ff8a80}
  #grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px}
  .g{background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .g img{display:block;width:100%;aspect-ratio:1/3;object-fit:cover;background:#fff}
  .g div{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;font-size:12px;opacity:.9}
  .g a{color:var(--accent2);font-weight:800;text-decoration:none}
  .empty{padding:30px;text-align:center;opacity:.75;border:1px dashed var(--line);border-radius:14px}
  [hidden]{display:none!important}
</style></head><body><div class="wrap">
<header><img src="/icon-192.png" alt=""><div><div class="badge">ALBUM PHOTOBOX</div></div></header>
<h1 id="title">Memuat album...</h1>
<p class="meta" id="meta"></p>
<div class="bar"><button id="zip" disabled>Unduh semua (zip)</button><span class="prog" id="prog"></span></div>
<div id="grid"></div>
</div>
<script src="/zip.js"></script>
<script>
(function () {
  var token = location.pathname.split('/').pop();
  var items = [], title = 'album';
  var $ = function (i) { return document.getElementById(i); };
  function fmt(t) { return new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  fetch('/api/album/' + token, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('Album tidak ditemukan atau tautannya sudah diganti.');
    return r.json();
  }).then(function (j) {
    items = j.items; title = j.event.name;
    document.title = 'Album ' + title;
    $('title').textContent = title;
    $('meta').textContent = items.length + ' foto. Foto dihapus otomatis ' + j.event.retentionDays + ' hari setelah diambil, jadi unduh sebelum itu ya.';
    if (!items.length) { $('grid').innerHTML = '<div class="empty" style="grid-column:1/-1">Belum ada foto di acara ini.</div>'; return; }
    items.slice().reverse().forEach(function (it) {
      var d = document.createElement('div'); d.className = 'g';
      var img = document.createElement('img'); img.loading = 'lazy'; img.src = '/api/photo/' + it.id; img.alt = 'Foto';
      var f = document.createElement('div'); var s = document.createElement('span'); s.textContent = fmt(it.uploaded);
      var a = document.createElement('a'); a.href = '/api/photo/' + it.id + '?dl=1'; a.textContent = 'Unduh';
      f.appendChild(s); f.appendChild(a); d.appendChild(img); d.appendChild(f); $('grid').appendChild(d);
    });
    $('zip').disabled = false;
  }).catch(function (e) { $('title').textContent = 'Album tidak tersedia'; $('meta').innerHTML = '<span class="err"></span>'; $('meta').firstChild.textContent = e.message; });
  $('zip').addEventListener('click', function () {
    $('zip').disabled = true;
    var safe = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'album';
    window.PhotoboxZip.downloadAll(items, 'album-' + safe + '.zip', function (d, t) { $('prog').textContent = 'Menyiapkan ' + d + ' / ' + t + '...'; })
      .then(function (n) { $('prog').textContent = n + ' foto diunduh.'; $('zip').disabled = false; })
      .catch(function (e) { $('prog').innerHTML = '<span class="err"></span>'; $('prog').firstChild.textContent = e.message; $('zip').disabled = false; });
  });
})();
</script></body></html>`;

export async function onRequestGet({ params }) {
  if (!TOKEN_RE.test(String(params.token || ''))) {
    return new Response('Album tidak ditemukan.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response(PAGE, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer'
    }
  });
}
