/**
 * Shared rendering + helpers used by both the local server (server.js)
 * and the Vercel serverless function (api/index.js).
 *
 * Storage is NOT here — each entrypoint plugs in its own store and passes a
 * plain `data` object of the shape:
 *   { recipients: { [token]: { label, created } }, clicks: [ { token, at, ip, ua } ] }
 */

const crypto = require("crypto");

function token() {
  return crypto.randomBytes(6).toString("hex"); // 12 hex chars
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- the educational landing page (the "reveal") --------------------------
// A security-terminal "gotcha": ASCII OLÉ! scrambles in (machine/mono alarm),
// then hands off to a calm human debrief (sans). One amber accent, one texture.
function learnPage(label) {
  const who = label ? esc(label) : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Olé! — you got phished</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    color-scheme: dark;
    --bg:#06080d; --panel:#0b0f17; --line:#1a2130; --line-soft:#131925;
    --ink:#eaeff7; --muted:#8a94a6; --faint:#5b6577;
    --amber:#ffb224; --amber-dim:#c9881a; --red:#ff4d4d; --cyan:#35c0e0;
  }
  *{box-sizing:border-box}
  html,body{margin:0; overflow-x:hidden}
  body{
    background:var(--bg); color:var(--ink);
    font-family:"Inter",system-ui,sans-serif; line-height:1.55;
    min-height:100vh; -webkit-font-smoothing:antialiased;
    display:flex; align-items:center; justify-content:center; padding:40px 20px;
  }
  /* one faint texture: scanlines, not glows */
  body::before{
    content:""; position:fixed; inset:0; pointer-events:none; z-index:2; opacity:.5;
    background:repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px);
    mix-blend-mode:overlay;
  }
  .term{ width:100%; max-width:680px; position:relative; z-index:1; }

  .statusbar{
    display:flex; justify-content:space-between; align-items:center; gap:12px;
    font-family:"JetBrains Mono",monospace; font-size:11.5px; letter-spacing:.14em;
    text-transform:uppercase; color:var(--faint);
    border-bottom:1px solid var(--line-soft); padding-bottom:12px; margin-bottom:34px;
  }
  .statusbar .live{display:flex; align-items:center; gap:8px; color:var(--muted)}
  .dot{width:7px; height:7px; border-radius:50%; background:var(--red);
       box-shadow:0 0 0 0 rgba(255,77,77,.6); animation:pulse 1.8s infinite}
  .statusbar .right{color:var(--amber-dim); text-align:right; word-break:break-all}

  .ascii-wrap{ text-align:center; overflow:hidden; }
  pre.ascii{
    display:inline-block; margin:0; text-align:left;
    font-family:"JetBrains Mono",monospace; font-weight:700;
    font-size:clamp(11px, 4.4vw, 30px); line-height:1.02; letter-spacing:.04em;
    color:var(--amber);
    text-shadow:0 0 22px rgba(255,178,36,.28);
    animation:flick 6s infinite;
  }

  .stage{ display:flex; align-items:center; justify-content:center;
          gap:clamp(14px,3.2vw,36px); flex-wrap:wrap; }
  .mask{ width:clamp(84px,13vw,128px); height:auto; flex:none;
         filter:drop-shadow(0 12px 28px rgba(0,0,0,.55));
         transform-origin:50% 92%; animation:tilt 6.5s ease-in-out infinite; }
  @keyframes tilt{ 0%,100%{transform:rotate(-3.5deg)} 50%{transform:rotate(3.5deg)} }

  .sound{ position:fixed; right:16px; bottom:16px; z-index:6;
          display:inline-flex; align-items:center; gap:9px;
          font-family:"JetBrains Mono",monospace; font-size:12px; letter-spacing:.08em;
          color:var(--amber); background:rgba(11,15,23,.9); backdrop-filter:blur(6px);
          border:1px solid var(--line); border-radius:999px; padding:9px 15px; cursor:pointer; }
  .sound:hover{ border-color:var(--amber-dim) }
  .sound .bars{ display:inline-flex; gap:2.5px; align-items:flex-end; height:13px }
  .sound .bars i{ width:2.5px; background:var(--amber); height:13px;
                  animation:eq .9s infinite ease-in-out }
  .sound .bars i:nth-child(2){ animation-delay:.18s }
  .sound .bars i:nth-child(3){ animation-delay:.36s }
  .sound.paused .bars i{ animation-play-state:paused; height:4px }
  @keyframes eq{ 0%,100%{height:4px} 50%{height:13px} }

  .verdict{
    font-size:clamp(28px,6vw,46px); font-weight:700; letter-spacing:-.03em;
    margin:30px 0 6px; line-height:1.02;
  }
  .verdict em{ color:var(--amber); font-style:normal; }
  .sub{ font-size:clamp(16px,2.4vw,19px); color:var(--muted); margin:0 0 4px; max-width:52ch }
  .sub b{ color:var(--ink); font-weight:600 }
  .when{
    display:inline-block; margin-top:18px; font-family:"JetBrains Mono",monospace;
    font-size:13px; letter-spacing:.06em; color:var(--amber);
    border:1px solid var(--line); border-radius:8px; padding:8px 14px;
  }
  .when b{color:var(--ink)}

  .debrief{ margin-top:46px; padding-top:30px; border-top:1px solid var(--line-soft) }
  .debrief h2{ font-size:19px; font-weight:600; margin:0 0 10px; letter-spacing:-.01em }
  .debrief p{ color:var(--muted); margin:0 0 22px; max-width:60ch }
  .debrief p strong{ color:var(--ink); font-weight:600 }

  .signs{ list-style:none; margin:0; padding:0; display:grid; gap:1px;
          background:var(--line-soft); border:1px solid var(--line-soft); border-radius:12px; overflow:hidden }
  .signs li{ background:var(--panel); padding:15px 18px; display:flex; gap:14px; align-items:baseline }
  .signs .k{ font-family:"JetBrains Mono",monospace; color:var(--amber-dim); font-size:12px; flex:none; width:22px }
  .signs .t{ font-size:14.5px; color:var(--ink) }
  .signs .t span{ color:var(--muted) }

  footer{ margin-top:30px; font-family:"JetBrains Mono",monospace; font-size:11.5px;
          letter-spacing:.1em; text-transform:uppercase; color:var(--faint) }

  @keyframes pulse{ 0%{box-shadow:0 0 0 0 rgba(255,77,77,.55)} 70%{box-shadow:0 0 0 7px rgba(255,77,77,0)} 100%{box-shadow:0 0 0 0 rgba(255,77,77,0)} }
  @keyframes flick{
    0%,90%,100%{ text-shadow:0 0 22px rgba(255,178,36,.28) }
    92%{ text-shadow:2px 0 var(--red), -2px 0 var(--cyan), 0 0 22px rgba(255,178,36,.28) }
    94%{ transform:translateX(-1px) }
    96%{ text-shadow:-2px 0 var(--red), 2px 0 var(--cyan), 0 0 22px rgba(255,178,36,.28); transform:translateX(1px) }
    97%{ transform:none }
  }
  @media (prefers-reduced-motion:reduce){
    .ascii,.dot,.mask,.sound .bars i{ animation:none }
  }
  @media (max-width:560px){
    body{ padding:26px 16px 80px; align-items:flex-start }
    .statusbar{ flex-direction:column; align-items:flex-start; gap:6px;
                font-size:10px; margin-bottom:26px }
    .statusbar .right{ text-align:left }
    .stage{ flex-direction:column; gap:14px }
    .mask{ width:92px }
    pre.ascii{ font-size:clamp(13px,6.4vw,24px) }
    .verdict{ font-size:30px; margin-top:26px }
    .sub{ font-size:16px }
    .when{ font-size:12px }
    .debrief{ margin-top:34px; padding-top:26px }
    .debrief h2{ font-size:18px }
    .signs li{ padding:13px 14px; gap:11px }
    .signs .t{ font-size:14px }
    .sound{ right:12px; bottom:12px; font-size:11px; padding:8px 13px }
  }
</style></head>
<body>
  <main class="term">
    <div class="statusbar">
      <span class="live"><span class="dot"></span>Security awareness drill</span>
      <span class="right">Error 404 · flagged${who ? " · " + who : ""}</span>
    </div>

    <div class="stage">
      <svg class="mask" viewBox="0 0 200 248" role="img" aria-label="Robber mask">
        <path d="M100 10 C150 10 180 48 180 102 C180 162 150 222 100 238 C50 222 20 162 20 102 C20 48 50 10 100 10 Z"
              fill="#f2ede3" stroke="#0a0f17" stroke-width="5"/>
        <path d="M46 86 Q74 64 100 80 L98 92 Q74 78 52 96 Z" fill="#0a0f17"/>
        <path d="M154 86 Q126 64 100 80 L102 92 Q126 78 148 96 Z" fill="#0a0f17"/>
        <path d="M56 104 Q74 92 92 104 Q74 116 56 104 Z" fill="#0a0f17"/>
        <path d="M108 104 Q126 92 144 104 Q126 116 108 104 Z" fill="#0a0f17"/>
        <path d="M100 100 L90 150 Q100 160 110 150 Z" fill="none" stroke="#0a0f17" stroke-width="4" stroke-linejoin="round"/>
        <path d="M100 166 C86 154 66 150 48 156 C30 162 28 178 40 182 C44 170 60 168 76 170 C86 171 95 172 100 166 Z"
              fill="#0a0f17"/>
        <path d="M100 166 C114 154 134 150 152 156 C170 162 172 178 160 182 C156 170 140 168 124 170 C114 171 105 172 100 166 Z"
              fill="#0a0f17"/>
        <path d="M100 162 C97 174 97 182 100 190 C103 182 103 174 100 162 Z" fill="#0a0f17"/>
        <path d="M94 198 Q100 214 106 198 Q100 204 94 198 Z" fill="#0a0f17"/>
      </svg>
      <div class="ascii-wrap">
<pre class="ascii" aria-label="O L E !">
█████  █      █████  █
█   █  █      █      █
█   █  █      ████   █
█   █  █      █
█████  █████  █████  █
</pre>
      </div>
    </div>

    <p class="verdict">You just got <em>phished</em>.</p>
    <p class="sub">This was a test — and you clicked it.</p>
    <span class="when">See you in class · <b>9:30 sharp</b></span>

    <section class="debrief">
      <h2>Relax — no harm done.</h2>
      <p>Nothing was installed. <strong>No password, data, or account was touched</strong> —
         this link only recorded the click. It was a routine, authorised security-awareness
         drill so the team can practise spotting the real thing. No one is in trouble; the
         point is the lesson.</p>
      <ul class="signs">
        <li><span class="k">01</span><span class="t">Hover a link before clicking. <span>The text you see can lie about where it goes.</span></span></li>
        <li><span class="k">02</span><span class="t">Check the sender's real address. <span>A familiar name is not a verified address.</span></span></li>
        <li><span class="k">03</span><span class="t">Urgency is bait. <span>"Act now or lose access" is designed to stop you thinking.</span></span></li>
      </ul>
    </section>

    <footer>Training routine${who ? " · " + who : ""} · this page logged a click, nothing more</footer>
  </main>

  <button class="sound paused" id="sound" type="button" aria-label="Play music">
    <span class="bars"><i></i><i></i><i></i></span> Bella ciao
  </button>

  <script>
  (function(){
    var pre = document.querySelector('.ascii');
    if(!pre) return;
    var final = pre.textContent;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){ return; }
    var glyphs = '█▓▒░#@%&$*+=?/';
    var chars = final.split('');
    var order = [];
    for(var i=0;i<chars.length;i++){ if(chars[i].trim() !== '') order.push(i); }
    for(var j=order.length-1;j>0;j--){ var r=Math.floor(Math.random()*(j+1)); var tmp=order[j]; order[j]=order[r]; order[r]=tmp; }
    var revealed = {};
    function paint(){
      var out = '';
      for(var k=0;k<chars.length;k++){
        if(chars[k].trim()===''){ out += chars[k]; }
        else if(revealed[k]){ out += final[k]; }
        else { out += glyphs[Math.floor(Math.random()*glyphs.length)]; }
      }
      pre.textContent = out;
    }
    paint();
    var frame=0, total=66;
    function tick(){
      frame++;
      var count = Math.floor(order.length * frame / total);
      for(var k=0;k<count;k++){ revealed[order[k]] = true; }
      paint();
      if(frame < total){ setTimeout(function(){ requestAnimationFrame(tick); }, 46); }
      else { pre.textContent = final; }
    }
    // brief hold on full scramble before it resolves
    setTimeout(function(){ requestAnimationFrame(tick); }, 420);
  })();
  </script>

  <script>
  (function(){
    var btn = document.getElementById('sound');
    if(!btn) return;
    var ctx=null, playing=false, started=false, loopTimer=null;
    var N={E4:329.63,G4:392.00,Gs4:415.30,A4:440.00,B4:493.88,C5:523.25,D5:587.33,E5:659.25,A5:880.00};
    // "Bella Ciao" — 19th-century public-domain folk melody, simplified.
    var S=[
      ['E4',1],['A4',1],['B4',1],['C5',1],['B4',1],['A4',2],
      ['E4',1],['A4',1],['B4',1],['C5',1],['B4',1],['A4',2],
      ['E4',1],['A4',1],['B4',1],['C5',1],['B4',1],['A4',1],['C5',1],
      ['B4',1],['A4',1],['Gs4',1],['B4',1],['E4',2],
      ['E5',1],['E5',1],['E5',1],['C5',1],['E5',2],
      ['D5',1],['D5',1],['D5',1],['B4',1],['D5',2],
      ['C5',1],['C5',1],['B4',1],['A4',1],['Gs4',1],['B4',1],['A4',3]
    ];
    var beat=0.21;
    function tone(freq, start, dur){
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='triangle'; o.frequency.value=freq;
      o.connect(g); g.connect(ctx.destination);
      var t=ctx.currentTime+start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, t+dur*0.96);
      o.start(t); o.stop(t+dur+0.02);
    }
    function schedule(){
      var at=0.06, total=0;
      for(var i=0;i<S.length;i++){ var d=S[i][1]*beat; tone(N[S[i][0]], at, d*0.9); at+=d; total=at; }
      clearTimeout(loopTimer);
      loopTimer=setTimeout(function(){ if(playing) schedule(); }, total*1000+150); // loop
    }
    function play(){
      if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.resume) ctx.resume();
      playing=true; started=true; btn.classList.remove('paused');
      schedule();
    }
    function stop(){ playing=false; btn.classList.add('paused'); clearTimeout(loopTimer); if(ctx){ try{ctx.close();}catch(e){} ctx=null; } }
    btn.addEventListener('click', function(e){ e.stopPropagation(); if(playing) stop(); else play(); });
    // Autoplay-with-sound is blocked until a gesture, so: try on load, and start
    // on the FIRST interaction of any kind (tap, scroll, key, move).
    var EVS=['pointerdown','touchstart','click','keydown','scroll','wheel','mousemove'];
    function kick(e){ if(e && btn.contains(e.target)) return; if(!started) play(); off(); }
    function off(){ EVS.forEach(function(ev){ window.removeEventListener(ev,kick); }); }
    EVS.forEach(function(ev){ window.addEventListener(ev,kick,{passive:true}); });
    window.addEventListener('load', function(){
      if(started) return;
      if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
      ctx.resume().then(function(){ if(!started && ctx.state==='running'){ play(); off(); } }).catch(function(){});
    });
  })();
  </script>
</body></html>`;
}

// --- the admin / dashboard page -------------------------------------------
// opts: { notice, defaultFrom, resendReady }
function adminPage(data, base, opts = {}) {
  const rows = Object.entries(data.recipients).map(([tok, r]) => {
    const clicks = data.clicks.filter((c) => c.token === tok);
    const last = clicks.length ? new Date(clicks[clicks.length - 1].at).toLocaleString() : "—";
    const sent = r.sentAt ? "✅" : "—";
    return `<tr>
      <td>${esc(r.label)}</td>
      <td style="text-align:center">${sent}</td>
      <td style="text-align:center">${clicks.length ? "✅ " + clicks.length : "—"}</td>
      <td>${esc(last)}</td>
      <td><a href="${base}/t/${tok}">/t/${tok}</a></td>
    </tr>`;
  }).join("");

  const totalRecipients = Object.keys(data.recipients).length;
  const totalSent = Object.values(data.recipients).filter((r) => r.sentAt).length;
  const totalClicked = Object.keys(data.recipients)
    .filter((t) => data.clicks.some((c) => c.token === t)).length;
  const rate = totalSent ? Math.round((totalClicked / totalSent) * 100) : 0;

  const defaultFrom = opts.defaultFrom || "IT Helpdesk <onboarding@resend.dev>";
  const defaultBody = `<p>Hi,</p>
<p>Your mailbox is almost full. Verify your account to avoid interruption:</p>
<p><a href="{{link}}">Review my mailbox</a></p>
<p>— IT Helpdesk</p>`;

  const notice = opts.notice
    ? `<div class="notice">${esc(opts.notice)}</div>`
    : "";
  const resendWarn = opts.resendReady
    ? ""
    : `<div class="notice warn">⚠️ RESEND_API_KEY is not set, so sending is disabled.
        Add it as an env var (and verify a sending domain in Resend), then redeploy.</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Training Dashboard</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a;
         color: #e2e8f0; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
  h1 { font-size: 24px; } h2 { font-size: 16px; color: #cbd5e1; margin: 0 0 12px; }
  .stat { display: inline-block; background: #1e293b; border: 1px solid #334155;
          border-radius: 12px; padding: 14px 22px; margin: 0 10px 10px 0; }
  .stat b { font-size: 26px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; font-weight: 600; }
  a { color: #7dd3fc; word-break: break-all; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
          padding: 18px; margin-top: 22px; }
  label { display:block; font-size: 13px; color:#cbd5e1; margin-bottom: 6px; }
  input, textarea { width: 100%; box-sizing: border-box; background: #0f172a;
          border: 1px solid #334155; color: #e2e8f0; padding: 9px 11px;
          border-radius: 8px; font-size: 14px; font-family: inherit; }
  textarea { resize: vertical; }
  button { background: #f59e0b; color: #1e1b06; border: 0; padding: 10px 18px;
           border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 12px; }
  .muted { color: #94a3b8; font-size: 13px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .notice { background:#064e3b; border:1px solid #065f46; color:#d1fae5;
            border-radius:10px; padding:10px 14px; margin-top:16px; font-size:14px; }
  .notice.warn { background:#422006; border-color:#854d0e; color:#fde68a; }
  @media (max-width:640px){ .row{ grid-template-columns:1fr; } }
</style></head>
<body><div class="wrap">
  <h1>Phishing Training</h1>
  ${notice}${resendWarn}
  <div style="margin-top:16px">
    <span class="stat"><b>${totalRecipients}</b> recipients</span>
    <span class="stat"><b>${totalSent}</b> sent</span>
    <span class="stat"><b>${totalClicked}</b> clicked</span>
    <span class="stat"><b>${rate}%</b> click rate</span>
  </div>

  <div class="card">
    <h2>1 · Recipients</h2>
    <form method="POST" action="/admin/add">
      <label>Paste email addresses (one per line, or comma-separated)</label>
      <textarea name="labels" rows="4" placeholder="ama@example.com&#10;kwin@example.com" required></textarea>
      <button type="submit">Add recipients</button>
    </form>
    <table>
      <thead><tr><th>Recipient</th><th>Sent</th><th>Clicked</th><th>Last click</th><th>Link</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="muted">No recipients yet.</td></tr>`}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>2 · Compose &amp; send</h2>
    <form method="POST" action="/admin/send">
      <div class="row">
        <div><label>From (must be on a domain verified in Resend)</label>
          <input name="from" value="${esc(defaultFrom)}" required></div>
        <div><label>Subject</label>
          <input name="subject" value="Action needed: mailbox storage full" required></div>
      </div>
      <div style="margin-top:12px">
        <label>Email body (HTML) — use <code>{{link}}</code> for the tracking link and <code>{{email}}</code> for the address</label>
        <textarea name="body" rows="8" required>${esc(defaultBody)}</textarea>
      </div>
      <button type="submit" ${opts.resendReady ? "" : "disabled style='opacity:.5;cursor:not-allowed'"}>
        Send to all ${totalRecipients} recipients
      </button>
    </form>
    <p class="muted" style="margin-top:14px">
      Each recipient gets their own tracking link in place of <code>{{link}}</code>.
      Clicks log to the dashboard and show an educational page — no passwords are ever collected.
    </p>
  </div>
</div></body></html>`;
}

module.exports = { token, esc, learnPage, adminPage };
