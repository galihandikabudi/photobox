// GET /w/:token — layar tayang langsung (TV/proyektor): foto terbaru tamu bergulir otomatis, foto baru muncul sorot + konfeti.
// Tautan rahasia = token album acara; tanpa login. Datanya dari /api/wall/:token.
import { TOKEN_RE } from '../_lib/common.js';

const PAGE = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0E1745">
<title>Layar Tayang Photobox</title>
<link rel="icon" href="/icon-192.png">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
  :root{--navy:#0E1745;--accent:#F28C00;--accent2:#FFB13D;--cream:#fff8e7;--bg1:#1B2E6E;--bg2:#0E1745}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;overflow:hidden;background:var(--bg2);color:var(--cream);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:none}
  body{background:radial-gradient(60vw 50vh at 85% 0%,rgba(255,255,255,.14),transparent 70%),linear-gradient(160deg,var(--bg1) 0%,var(--bg2) 100%)}
  header{position:fixed;left:0;right:0;top:0;z-index:5;display:flex;align-items:flex-end;justify-content:space-between;padding:3.2vh 4vw 0}
  .brand{font-weight:800;letter-spacing:.35em;font-size:1.9vh;color:var(--accent2);margin-bottom:.8vh}
  h1{font-size:7.6vh;line-height:1.05;font-weight:800;text-shadow:0 .5vh 3vh rgba(0,0,0,.4)}
  .count{text-align:right;font-weight:800}
  .count b{display:block;font-size:7.6vh;line-height:1;color:var(--accent2)}
  .count small{font-size:1.9vh;letter-spacing:.25em;opacity:.85}
  #stage{position:fixed;left:0;right:0;top:19vh;bottom:7vh;overflow:hidden}
  #track{position:absolute;left:0;top:0;height:100%;display:flex;align-items:center;gap:3vh;padding:0 3vh;will-change:transform}
  .c{flex:none;height:92%;display:flex;align-items:center;justify-content:center;transform:rotate(var(--r,0deg));transition:transform .4s}
  .c img{display:block;height:100%;width:auto;border-radius:1.2vh;background:#fff;box-shadow:0 2vh 5vh rgba(0,0,0,.5)}
  .c.fresh{animation:drop .9s cubic-bezier(.2,.9,.3,1.2)}
  @keyframes drop{from{transform:translateY(-40vh) scale(.6) rotate(-12deg);opacity:0}to{transform:rotate(var(--r,0deg));opacity:1}}
  footer{position:fixed;left:0;right:0;bottom:0;z-index:5;height:7vh;display:flex;align-items:center;justify-content:center;font-size:2.6vh;font-weight:700;opacity:.92;letter-spacing:.04em;text-shadow:0 .3vh 1.5vh rgba(0,0,0,.5)}
  #msg{position:fixed;left:0;right:0;top:19vh;bottom:7vh;display:none;align-items:center;justify-content:center;text-align:center;font-size:4vh;font-weight:700;padding:0 8vw;opacity:.85;line-height:1.4}
  #spot{position:fixed;inset:0;z-index:8;display:none;align-items:center;justify-content:center;background:rgba(6,10,36,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  #spot.on{display:flex;animation:fadein .35s ease-out}
  @keyframes fadein{from{opacity:0}to{opacity:1}}
  #spot .card{position:relative;height:80vh;margin-top:6vh;display:flex;flex-direction:column;align-items:center;gap:2.2vh;animation:pop .9s cubic-bezier(.2,.9,.3,1.25)}
  @keyframes pop{from{transform:scale(.4) rotate(-10deg);opacity:0}to{transform:none;opacity:1}}
  #spot img{height:100%;width:auto;border-radius:1.6vh;background:#fff;box-shadow:0 0 12vh rgba(242,140,0,.55),0 3vh 8vh rgba(0,0,0,.6)}
  #spot .tag{position:absolute;top:-6.5vh;left:50%;transform:translateX(-50%) rotate(-3deg);background:linear-gradient(180deg,var(--accent2),var(--accent));color:var(--navy);font-weight:800;font-size:3.4vh;padding:.8vh 3vh;border-radius:99px;white-space:nowrap;box-shadow:0 1vh 3vh rgba(0,0,0,.4)}
  .conf{position:fixed;top:-4vh;z-index:9;width:1.2vh;height:2.2vh;pointer-events:none;animation:fall linear forwards}
  @keyframes fall{to{transform:translateY(112vh) rotate(720deg);opacity:.9}}
  #dot{position:fixed;right:1.4vh;bottom:1.4vh;width:1.2vh;height:1.2vh;border-radius:50%;background:#7be495;opacity:.6;z-index:6}
  #dot.off{background:#ff8a80}
  [hidden]{display:none!important}
</style></head><body>
<header><div><div class="brand" id="brand"></div><h1 id="title">Photobox</h1></div><div class="count"><b id="cnt">0</b><small>FOTO</small></div></header>
<div id="stage"><div id="track"></div></div>
<div id="msg"></div>
<footer id="foot"></footer>
<div id="spot"><div class="card"><div class="tag">Foto baru!</div><img id="spotImg" alt=""></div></div>
<div id="dot" title="Status sambungan"></div>
<script>
(function(){
  var token = location.pathname.split('/').filter(Boolean).pop() || '';
  var $ = function(i){ return document.getElementById(i); };
  var FONT = {poppins:'Poppins',montserrat:'Montserrat',playfair:'Playfair Display',lobster:'Lobster',pacifico:'Pacifico',bebas:'Bebas Neue',oswald:'Oswald',dancing:'Dancing Script',fredoka:'Fredoka',caveat:'Caveat'};
  var POLL = 6000, SPOT_MS = 8000, MAXCARDS = 24, SPEED = 55;   // SPEED = piksel per detik
  var seen = {}, first = true, order = [], queue = [], spotting = false, offX = 0, last = 0;
  var track = $('track'), stage = $('stage');

  function hexRGB(h){ return [1,3,5].map(function(i){ return parseInt(h.slice(i,i+2),16); }); }
  function mix(h,t,a){ return '#' + hexRGB(h).map(function(v){ return Math.round(v+(t-v)*a).toString(16).padStart(2,'0'); }).join(''); }
  function applyEvent(ev){
    var title = ev.title || ev.name || 'Photobox';
    $('title').textContent = title;
    $('brand').textContent = ev.brandLine || '';
    $('foot').textContent = ev.welcome || 'Foto kalian tampil di sini. Ayo foto di photobox!';
    document.title = title + ' | Layar Tayang';
    var st = ev.styles && ev.styles.title;
    if (st && st.font && FONT[st.font]) $('title').style.fontFamily = '"' + FONT[st.font] + '", sans-serif';
    if (st && st.color) $('title').style.color = st.color;
    var c = ev.bgColor;
    if (/^#[0-9a-f]{6}$/i.test(c || '')) {
      document.documentElement.style.setProperty('--bg1', mix(c,255,.1));
      document.documentElement.style.setProperty('--bg2', mix(c,0,.35));
      var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', mix(c,255,.1));
    }
  }

  function mkCard(id, fresh){
    var d = document.createElement('div');
    d.className = 'c' + (fresh ? ' fresh' : '');
    d.dataset.id = id;
    d.style.setProperty('--r', ((Math.random()*4 - 2)).toFixed(2) + 'deg');
    var im = document.createElement('img');
    im.alt = ''; im.decoding = 'async';
    im.src = '/api/photo/' + id;
    d.appendChild(im);
    return d;
  }
  function rebuildTrack(){
    // set kartu tampil; bila total lebar kurang dari layar: diam di tengah, jika lebih: gulir berulang tanpa putus
    var extra = track.querySelectorAll('.dup'); for (var i=0;i<extra.length;i++) extra[i].remove();
    var kids = track.children, w = 0;
    for (var k=0;k<kids.length;k++) w += kids[k].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    track.dataset.w = w;
    if (w > stage.clientWidth * 0.98) {
      var n = kids.length;
      for (var j=0;j<n;j++){ var c = kids[j].cloneNode(true); c.classList.add('dup'); c.classList.remove('fresh'); track.appendChild(c); }
      track.style.justifyContent = 'flex-start'; track.dataset.loop = '1';
    } else {
      track.dataset.loop = '0'; offX = 0; track.style.transform = 'none';
      track.style.width = '100%'; track.style.justifyContent = 'center';
    }
    if (track.dataset.loop === '1') track.style.width = 'auto';
  }
  function addFront(id, fresh){
    var c = mkCard(id, fresh);
    var orig = track.querySelectorAll('.c:not(.dup)');
    if (orig.length) track.insertBefore(c, orig[0]); else track.appendChild(c);
    order.unshift(id);
    while (order.length > MAXCARDS) { var gone = order.pop(); var els = track.querySelectorAll('[data-id="' + gone + '"]'); for (var i=0;i<els.length;i++) els[i].remove(); }
    var im = c.querySelector('img');
    var after = function(){ rebuildTrack(); };
    if (im.complete) after(); else { im.onload = after; im.onerror = after; }
  }

  function confetti(){
    var cols = ['#ff5d8f','#ffd23f','#3ddad7','#ffffff','#b388ff','#7be495','#F28C00'];
    for (var i=0;i<70;i++){
      var e = document.createElement('i'); e.className = 'conf';
      e.style.left = (Math.random()*100) + 'vw';
      e.style.background = cols[i % cols.length];
      e.style.animationDuration = (2.4 + Math.random()*2.6) + 's';
      e.style.animationDelay = (Math.random()*.9) + 's';
      e.style.transform = 'rotate(' + (Math.random()*360) + 'deg)';
      document.body.appendChild(e);
      setTimeout((function(el){ return function(){ el.remove(); }; })(e), 7000);
    }
  }
  function spotlight(){
    if (spotting || !queue.length) return;
    spotting = true;
    var id = queue.shift();
    var im = $('spotImg'); im.src = '/api/photo/' + id;
    var show = function(){
      $('spot').classList.add('on'); confetti();
      setTimeout(function(){
        $('spot').classList.remove('on');
        addFront(id, true);
        setTimeout(function(){ spotting = false; spotlight(); }, 600);
      }, SPOT_MS);
    };
    if (im.complete && im.naturalWidth) show(); else { im.onload = show; im.onerror = function(){ spotting = false; addFront(id, true); spotlight(); }; }
  }

  function setMsg(t){ var m = $('msg'); if (t) { m.textContent = t; m.style.display = 'flex'; } else m.style.display = 'none'; }

  function poll(){
    fetch('/api/wall/' + token, { cache: 'no-store' }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(j){
      $('dot').className = '';
      applyEvent(j.event || {});
      $('cnt').textContent = j.total || 0;
      var items = (j.items || []).slice().reverse();      // lama -> baru
      if (first) {
        first = false;
        items.slice(-MAXCARDS).forEach(function(it){ seen[it.id] = 1; addFront(it.id, false); });
        // addFront menaruh yang terakhir di depan; item sudah urut lama->baru jadi yang terbaru berada di depan
        items.forEach(function(it){ seen[it.id] = 1; });
      } else {
        items.forEach(function(it){ if (!seen[it.id]) { seen[it.id] = 1; queue.push(it.id); } });
        spotlight();
      }
      setMsg(!order.length && !queue.length && !spotting ? 'Belum ada foto. Jadilah yang pertama foto di photobox!' : '');
    }).catch(function(e){
      $('dot').className = 'off';
      if (first && String(e.message).indexOf('404') >= 0) { first = false; setMsg('Layar tayang tidak ditemukan. Periksa tautannya di Admin > Acara.'); }
    });
  }

  function frame(t){
    if (!last) last = t;
    var dt = (t - last) / 1000; last = t;
    if (track.dataset.loop === '1' && !spotting) {
      var half = parseFloat(track.dataset.w || 0);
      offX -= SPEED * dt;
      if (half && -offX >= half) offX += half;
      track.style.transform = 'translate3d(' + offX.toFixed(1) + 'px,0,0)';
    }
    requestAnimationFrame(frame);
  }

  function wake(){ try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function(){}); } catch(e){} }
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) wake(); });
  document.addEventListener('click', function(){
    var el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function(){});
  });
  window.addEventListener('resize', function(){ rebuildTrack(); });
  wake(); poll(); setInterval(poll, POLL); requestAnimationFrame(frame);
})();
</script></body></html>`;

export async function onRequestGet({ params }) {
  const token = String(params.token || '');
  if (!TOKEN_RE.test(token)) return new Response('Layar tayang tidak ditemukan.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
