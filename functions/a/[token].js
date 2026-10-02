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
  .rep{background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:20px}
  .rep h2{font-size:18px;font-weight:800;margin-bottom:12px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
  .kpi{background:rgba(0,0,0,.2);border-radius:12px;padding:12px 14px}
  .kpi small{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.7;font-weight:800}
  .kpi b{font-size:24px;font-weight:800;display:block;margin-top:2px}
  .kpi span{font-size:12px;opacity:.7}
  .rep h3{font-size:14px;margin:14px 0 8px;opacity:.9}
  .bars{display:flex;align-items:flex-end;gap:4px;height:150px;padding-top:18px;overflow-x:auto}
  .bars .c{flex:1 0 22px;max-width:56px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px}
  .bars .c i{display:block;width:100%;background:linear-gradient(180deg,var(--accent2),var(--accent));border-radius:5px 5px 0 0;min-height:2px}
  .bars .c em{font-style:normal;font-weight:800;margin-bottom:2px}
  .bars .c u{text-decoration:none;opacity:.75;margin-top:4px;white-space:nowrap}
  .bars .c .d{opacity:.55;font-size:9px}
  .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .lst{list-style:none;display:flex;flex-direction:column;gap:6px;font-size:14px}
  .lst li{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;background:rgba(0,0,0,.18);border-radius:8px}
  .lst li b{color:var(--accent2)}
  button.ghost{background:rgba(255,255,255,.08);color:var(--cream);border:1px solid var(--line)}
  @media print{
    body{background:#fff!important;color:#111!important;padding:0}
    .bar,#grid,header .badge,.noprint{display:none!important}
    .rep{background:#fff!important;border:1px solid #bbb;color:#111}
    .kpi{background:#f3f3f3!important}.lst li{background:#f3f3f3!important}
    .bars .c i{background:#F28C00!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .meta{color:#444}
  }
</style></head><body><div class="wrap">
<header><img src="/icon-192.png" alt=""><div><div class="badge">ALBUM PHOTOBOX</div></div></header>
<h1 id="title">Memuat album...</h1>
<p class="meta" id="meta"></p>
<div class="bar"><button id="zip" disabled>Unduh semua foto (zip)</button><button id="csv" class="ghost" disabled>Laporan (CSV)</button><button id="prt" class="ghost" disabled>Cetak / simpan laporan (PDF)</button><span class="prog" id="prog"></span></div>
<section class="rep" id="rep" hidden>
  <h2>Laporan acara</h2>
  <div class="kpis" id="kpis"></div>
  <h3>Sesi foto per jam</h3>
  <div class="bars" id="bars"></div>
  <div class="two">
    <div><h3>Tata letak yang dipakai</h3><ul class="lst" id="lays"></ul></div>
    <div><h3>Desain terpopuler</h3><ul class="lst" id="dess"></ul></div>
  </div>
  <p class="meta" id="repNote" style="margin-top:14px"></p>
</section>
<div id="grid"></div>
</div>
<script src="/zip.js"></script>
<script>
(function () {
  var token = location.pathname.split('/').pop();
  var items = [], title = 'album', R = null, evInfo = null;
  var $ = function (i) { return document.getElementById(i); };
  function fmt(t) { return new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  fetch('/api/album/' + token, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('Album tidak ditemukan atau tautannya sudah diganti.');
    return r.json();
  }).then(function (j) {
    items = j.items; title = j.event.name; evInfo = j.event;
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
    $('zip').disabled = false; $('csv').disabled = false; $('prt').disabled = false;
    buildReport();
  }).catch(function (e) { $('title').textContent = 'Album tidak tersedia'; $('meta').innerHTML = '<span class="err"></span>'; $('meta').firstChild.textContent = e.message; });
  $('zip').addEventListener('click', function () {
    $('zip').disabled = true;
    var safe = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'album';
    var extra = R ? [{ name: 'laporan.csv', text: '\ufeff' + csvText() }, { name: 'laporan.txt', text: txtText() }] : [];
    window.PhotoboxZip.downloadAll(items, 'album-' + safe + '.zip', function (d, t) { $('prog').textContent = 'Menyiapkan ' + d + ' / ' + t + '...'; }, extra)
      .then(function (n) { $('prog').textContent = n + ' foto diunduh.'; $('zip').disabled = false; })
      .catch(function (e) { $('prog').innerHTML = '<span class="err"></span>'; $('prog').firstChild.textContent = e.message; $('zip').disabled = false; });
  });

  /* ---------- laporan ---------- */
  var TZ = 'Asia/Jakarta';
  var LAYN = { strip4: 'Strip 4 foto', strip3: 'Strip 3 foto', strip2: 'Strip 2 foto', grid4: 'Kartu 4 foto', grid6: 'Kartu 6 foto', strip: 'Strip (jumlah foto tidak tercatat)', card: 'Kartu (jumlah foto tidak tercatat)' };
  function parts(t) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t));
    var o = {}; f.forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function buildReport() {
    if (!items.length) return;
    var byHour = {}, lays = {}, dess = {};
    items.forEach(function (it) {
      var p = parts(it.uploaded), k = p.year + '-' + p.month + '-' + p.day + ' ' + p.hour;
      byHour[k] = (byHour[k] || 0) + 1;
      var l = it.layout || ''; lays[l] = (lays[l] || 0) + 1;
      if (it.design) dess[it.design] = (dess[it.design] || 0) + 1;
    });
    var keys = Object.keys(byHour).sort();
    // isi jam kosong di antara jam pertama dan terakhir (maks. 96 jam)
    var first = items[0].uploaded, last = items[items.length - 1].uploaded, rows = [];
    var t = Math.floor(first / 3600000) * 3600000, n = 0;
    while (t <= last && n < 96) { var p = parts(t); var k = p.year + '-' + p.month + '-' + p.day + ' ' + p.hour; rows.push({ k: k, day: p.day + '/' + p.month, h: p.hour, c: byHour[k] || 0 }); t += 3600000; n++; }
    var max = 0, peak = null; rows.forEach(function (r) { if (r.c > max) { max = r.c; peak = r; } });
    var active = rows.filter(function (r) { return r.c > 0; }).length;
    var span = (last - first) / 60000;
    R = { total: items.length, first: first, last: last, rows: rows, peak: peak, max: max, active: active, avg: active ? Math.round(items.length / active * 10) / 10 : 0, lays: lays, dess: dess };
    var fmtT = function (x) { return new Date(x).toLocaleString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
    var kp = [
      ['Total sesi foto', R.total, 'strip/kartu yang jadi'],
      ['Jam tersibuk', peak ? peak.h + ':00' : '-', max + ' sesi pada jam itu'],
      ['Rata-rata per jam aktif', R.avg, active + ' jam ada aktivitas'],
      ['Rentang', span >= 60 ? Math.floor(span / 60) + ' j ' + Math.round(span % 60) + ' m' : Math.round(span) + ' m', fmtT(first) + ' - ' + fmtT(last)]
    ];
    $('kpis').innerHTML = '';
    kp.forEach(function (x) { var d = document.createElement('div'); d.className = 'kpi'; d.innerHTML = '<small></small><b></b><span></span>'; d.children[0].textContent = x[0]; d.children[1].textContent = x[1]; d.children[2].textContent = x[2]; $('kpis').appendChild(d); });
    $('bars').innerHTML = '';
    rows.forEach(function (r, i) {
      var c = document.createElement('div'); c.className = 'c';
      var em = document.createElement('em'); em.textContent = r.c || '';
      var bar = document.createElement('i'); bar.style.height = (max ? Math.max(r.c ? 4 : 0, r.c / max * 100) : 0) + '%';
      var u = document.createElement('u'); u.textContent = r.h + ':00';
      c.appendChild(em); c.appendChild(bar); c.appendChild(u);
      if (i === 0 || r.h === '00') { var d = document.createElement('span'); d.className = 'd'; d.textContent = r.day; c.appendChild(d); }
      $('bars').appendChild(c);
    });
    function fill(id, obj, nameFn, top) {
      var ul = $(id); ul.innerHTML = '';
      var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, top);
      if (!ks.length) { var li = document.createElement('li'); li.textContent = 'Belum tercatat (hanya foto yang diambil setelah pembaruan terakhir yang tercatat)'; ul.appendChild(li); return; }
      ks.forEach(function (k) { var li = document.createElement('li'); var a = document.createElement('span'); a.textContent = nameFn(k); var b = document.createElement('b'); b.textContent = obj[k] + ' (' + Math.round(obj[k] / R.total * 100) + '%)'; li.appendChild(a); li.appendChild(b); ul.appendChild(li); });
    }
    try { fill('lays', lays, function (k) { return LAYN[k] || 'Tidak tercatat'; }, 5); } catch (e) { $('lays').innerHTML = '<li>Belum tercatat</li>'; }
    try { fill('dess', dess, function (k) { return k; }, 5); } catch (e) { $('dess').innerHTML = '<li>Belum tercatat</li>'; }
    $('repNote').textContent = 'Dibuat ' + new Date().toLocaleString('id-ID', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }) + ' WIB. Satu sesi = satu hasil foto yang terunggah. Jam ditampilkan dalam WIB.' + (evInfo && evInfo.retentionDays ? ' Foto dihapus otomatis ' + evInfo.retentionDays + ' hari setelah diambil; laporan hanya menghitung foto yang masih tersimpan.' : '');
    $('rep').hidden = false;
  }
  function csvText() {
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var out = ['Acara,' + q(title), 'Total sesi,' + R.total, '', 'Tanggal,Jam,Jumlah sesi'];
    R.rows.forEach(function (r) { out.push(q(r.day) + ',' + q(r.h + ':00') + ',' + r.c); });
    out.push('', 'Tata letak,Jumlah');
    Object.keys(R.lays).forEach(function (k) { out.push(q(LAYN[k] || 'Tidak tercatat') + ',' + R.lays[k]); });
    out.push('', 'Desain,Jumlah');
    Object.keys(R.dess).forEach(function (k) { out.push(q(k) + ',' + R.dess[k]); });
    return out.join('\\r\\n');
  }
  function txtText() {
    var L = ['LAPORAN ACARA PHOTOBOX', title, '', 'Total sesi foto : ' + R.total, 'Jam tersibuk    : ' + (R.peak ? R.peak.h + ':00 (' + R.max + ' sesi)' : '-'), 'Rata-rata/jam   : ' + R.avg + ' (' + R.active + ' jam aktif)', '', 'Sesi per jam (WIB):'];
    R.rows.forEach(function (r) { L.push('  ' + r.day + ' ' + r.h + ':00  ' + r.c); });
    return L.join('\\r\\n');
  }
  $('csv').addEventListener('click', function () {
    if (!R) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\\ufeff' + csvText()], { type: 'text/csv;charset=utf-8' }));
    a.download = 'laporan-' + (title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'acara') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  });
  $('prt').addEventListener('click', function () { window.print(); });
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
