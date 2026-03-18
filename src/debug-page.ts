export const DEBUG_PAGE = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pi-render · debug</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090f;--surface:#0e1119;--card:#121824;--card2:#161d2a;
  --border:#1a2336;--border-hi:#243050;
  --ink:#dde3f0;--muted:#7a869e;--hint:#3a4a62;
  --debug:#4da6ff;--info:#1db97e;--warn:#e09b3d;--error:#e05c7a;--fatal:#c026d3;
  --debug-bg:rgba(77,166,255,.08);--info-bg:rgba(29,185,126,.08);
  --warn-bg:rgba(224,155,61,.08);--error-bg:rgba(224,92,122,.08);--fatal-bg:rgba(192,38,211,.12);
}
html,body{height:100%;background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;overflow:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border-hi);border-radius:3px}

.layout{display:grid;grid-template-rows:52px 52px 1fr;height:100vh}

.topbar{
  display:flex;align-items:center;gap:12px;padding:0 1.25rem;
  background:rgba(7,9,15,.92);backdrop-filter:blur(18px);
  border-bottom:0.5px solid var(--border);z-index:100;
}
.logo{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--info)}
.logo-box{width:26px;height:26px;border-radius:7px;background:rgba(29,185,126,.12);border:0.5px solid rgba(29,185,126,.3);display:flex;align-items:center;justify-content:center;font-size:13px}
.logo em{color:var(--muted);font-style:normal;font-weight:400}
.logo span{color:var(--hint);font-weight:400;font-size:12px}
.gap{flex:1}
.live-badge{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--info);box-shadow:0 0 8px rgba(29,185,126,.4);animation:pulse 2.5s ease infinite}
.dot.off{background:var(--hint);box-shadow:none;animation:none}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.nav-link{font-size:11px;color:var(--muted);text-decoration:none;padding:4px 10px;border-radius:6px;border:0.5px solid var(--border);transition:all .15s}
.nav-link:hover{color:var(--ink);border-color:var(--border-hi)}

.toolbar{
  display:flex;align-items:center;gap:8px;padding:0 1.25rem;
  background:var(--surface);border-bottom:0.5px solid var(--border);
  overflow-x:auto;flex-shrink:0;
}
.filter-group{display:flex;gap:4px}
.f-btn{
  font-size:10px;font-weight:600;padding:3px 10px;border-radius:5px;
  background:transparent;border:0.5px solid var(--border);color:var(--muted);
  cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.04em;text-transform:uppercase;
  transition:all .15s;white-space:nowrap;
}
.f-btn:hover{color:var(--ink);border-color:var(--border-hi)}
.f-btn.active-debug{background:var(--debug-bg);color:var(--debug);border-color:var(--debug)}
.f-btn.active-info {background:var(--info-bg) ;color:var(--info) ;border-color:var(--info)}
.f-btn.active-warn {background:var(--warn-bg) ;color:var(--warn) ;border-color:var(--warn)}
.f-btn.active-error{background:var(--error-bg);color:var(--error);border-color:var(--error)}
.f-btn.active-fatal{background:var(--fatal-bg);color:var(--fatal);border-color:var(--fatal)}
.f-btn.active-all  {background:rgba(221,227,240,.08);color:var(--ink);border-color:var(--border-hi)}
.sep{width:0.5px;height:18px;background:var(--border);flex-shrink:0}
.search-box{
  background:var(--card);border:0.5px solid var(--border);border-radius:6px;
  padding:4px 10px;font-size:11px;color:var(--ink);font-family:'Source Code Pro',monospace;
  outline:none;width:200px;transition:border-color .15s;
}
.search-box:focus{border-color:var(--border-hi)}
.search-box::placeholder{color:var(--hint)}
.tb-btn{
  font-size:10px;font-weight:500;padding:4px 12px;border-radius:5px;
  background:transparent;border:0.5px solid var(--border);color:var(--muted);
  cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;
}
.tb-btn:hover{background:var(--card2);color:var(--ink);border-color:var(--border-hi)}
.tb-btn.danger{color:var(--error)}
.tb-btn.danger:hover{background:rgba(224,92,122,.1);border-color:var(--error)}
.auto-scroll-btn{color:var(--info)}
.auto-scroll-btn.on{background:rgba(29,185,126,.1);border-color:var(--info)}
.stats{margin-left:auto;display:flex;gap:10px;flex-shrink:0}
.stat{font-size:10px;font-family:'Source Code Pro',monospace;color:var(--muted);white-space:nowrap}
.stat span{font-weight:600}
.stat.s-debug span{color:var(--debug)}
.stat.s-info  span{color:var(--info)}
.stat.s-warn  span{color:var(--warn)}
.stat.s-error span{color:var(--error)}
.stat.s-fatal span{color:var(--fatal)}

.log-area{overflow-y:auto;padding:.5rem 0}

.row{
  display:grid;
  grid-template-columns:52px 56px 70px 1fr;
  gap:0;align-items:baseline;
  padding:3px 1.25rem;border-bottom:0.5px solid rgba(26,35,54,.5);
  font-size:11.5px;line-height:1.6;cursor:pointer;transition:background .1s;
  font-family:'Source Code Pro',monospace;
}
.row:hover{background:var(--card)}
.row.expanded{background:var(--card2);border-bottom-color:var(--border)}

.r-id  {color:var(--hint);font-size:10px}
.r-ts  {color:var(--hint);font-size:10px}
.r-lvl {font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:1px 6px;border-radius:4px;display:inline-block;text-align:center;justify-self:start;align-self:center}
.r-msg {color:var(--ink);padding-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row.expanded .r-msg{white-space:normal;word-break:break-word}

.lvl-DEBUG{background:var(--debug-bg);color:var(--debug)}
.lvl-INFO {background:var(--info-bg) ;color:var(--info)}
.lvl-WARN {background:var(--warn-bg) ;color:var(--warn)}
.lvl-ERROR{background:var(--error-bg);color:var(--error)}
.lvl-FATAL{background:var(--fatal-bg);color:var(--fatal)}

.detail{
  display:none;grid-column:1/-1;
  background:var(--surface);border:0.5px solid var(--border);border-radius:8px;
  margin:.5rem 1.25rem .75rem;padding:.875rem 1rem;
}
.row.expanded + .detail{display:block}
.d-row{display:flex;gap:8px;margin-bottom:6px;font-size:11px}
.d-label{color:var(--hint);font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:.06em;min-width:64px;flex-shrink:0}
.d-val{font-family:'Source Code Pro',monospace;color:var(--muted);word-break:break-all}
.d-val.hi{color:var(--ink)}
pre.stack{
  background:var(--card);border:0.5px solid var(--border);border-radius:6px;
  padding:.75rem 1rem;font-size:10.5px;overflow-x:auto;color:var(--error);
  line-height:1.65;margin-top:4px;white-space:pre-wrap;word-break:break-word;
}

.empty-log{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:calc(100% - 4rem);gap:10px;color:var(--hint);font-size:13px;text-align:center;
}
.empty-log code{font-size:11px;background:var(--card);border:0.5px solid var(--border);padding:3px 8px;border-radius:4px;color:var(--muted)}

.ctx{display:inline-block;font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,.05);color:var(--muted);margin-right:6px}

@keyframes newrow{from{background:rgba(29,185,126,.15)}to{background:transparent}}
.row.new-entry{animation:newrow 1.2s ease}
</style>
</head>
<body>
<div class="layout">

<div class="topbar">
  <div class="logo">
    <div class="logo-box">🐛</div>
    pi<em>-render</em> <span>/ debug</span>
  </div>
  <div class="gap"></div>
  <div class="live-badge"><div class="dot" id="dot"></div><span id="lbl">connecting…</span></div>
  <a href="/" class="nav-link">↖ Visuals</a>
</div>

<div class="toolbar">
  <div class="filter-group">
    <button class="f-btn active-all" data-filter="ALL"  onclick="setFilter('ALL',this)">All</button>
    <button class="f-btn" data-filter="DEBUG" onclick="setFilter('DEBUG',this)">Debug</button>
    <button class="f-btn" data-filter="INFO"  onclick="setFilter('INFO',this)">Info</button>
    <button class="f-btn" data-filter="WARN"  onclick="setFilter('WARN',this)">Warn</button>
    <button class="f-btn" data-filter="ERROR" onclick="setFilter('ERROR',this)">Error</button>
    <button class="f-btn" data-filter="FATAL" onclick="setFilter('FATAL',this)">Fatal</button>
  </div>
  <div class="sep"></div>
  <input class="search-box" type="text" placeholder="Search…" oninput="setSearch(this.value)" id="search">
  <div class="sep"></div>
  <button class="tb-btn auto-scroll-btn on" id="asBtn" onclick="toggleAutoScroll()">⬇ Auto-scroll</button>
  <button class="tb-btn" onclick="copyAll()">⎘ Copy all</button>
  <button class="tb-btn danger" onclick="clearLogs()">✕ Clear</button>
  <div class="stats">
    <div class="stat s-debug">DEBUG <span id="c-debug">0</span></div>
    <div class="stat s-info" >INFO  <span id="c-info">0</span></div>
    <div class="stat s-warn" >WARN  <span id="c-warn">0</span></div>
    <div class="stat s-error">ERROR <span id="c-error">0</span></div>
    <div class="stat s-fatal">FATAL <span id="c-fatal">0</span></div>
    <div class="stat">TOTAL <span id="c-total">0</span></div>
  </div>
</div>

<div class="log-area" id="logArea">
  <div class="empty-log" id="emptyMsg">
    <div style="font-size:28px">🔍</div>
    <div>Waiting for logs…</div>
    <code>localhost:3847/debug</code>
  </div>
</div>

</div>
<script>
let allLogs = [];
let filter  = 'ALL';
let search  = '';
let autoScroll = true;
let expandedId = null;

function connect() {
  const sse = new EventSource('/sse/debug');
  sse.onopen  = () => setLive(true);
  sse.onerror = () => { setLive(false); setTimeout(connect, 3000); };
  sse.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'history') {
        allLogs = msg.logs;
        renderAll();
      } else if (msg.type === 'log') {
        allLogs.push(msg.entry);
        if (allLogs.length > 5000) allLogs.shift();
        appendRow(msg.entry, true);
        updateStats();
        if (autoScroll) scrollBottom();
      } else if (msg.type === 'clear') {
        allLogs = [];
        renderAll();
      }
    } catch(err) {}
  };
}

function setLive(ok) {
  document.getElementById('dot').className = ok ? 'dot' : 'dot off';
  document.getElementById('lbl').textContent = ok ? 'connected' : 'reconnecting…';
}

function matches(e) {
  if (filter !== 'ALL' && e.level !== filter) return false;
  if (!search) return true;
  const q = search.toLowerCase();
  return (e.message||'').toLowerCase().includes(q)
    || (e.context||'').toLowerCase().includes(q)
    || (e.detail||'').toLowerCase().includes(q);
}

function renderAll() {
  const area = document.getElementById('logArea');
  const empty = document.getElementById('emptyMsg');
  const visible = allLogs.filter(matches);
  empty.style.display = visible.length ? 'none' : 'flex';
  area.innerHTML = '';
  if (!visible.length) { area.appendChild(empty); return; }
  area.appendChild(empty);
  visible.forEach(e => area.appendChild(makeRow(e, false)));
  updateStats();
  if (autoScroll) scrollBottom();
}

function appendRow(entry, isNew) {
  if (!matches(entry)) { updateStats(); return; }
  const area = document.getElementById('logArea');
  document.getElementById('emptyMsg').style.display = 'none';
  area.appendChild(makeRow(entry, isNew));
  updateStats();
}

function makeRow(e, isNew) {
  const frag = document.createDocumentFragment();

  const row = document.createElement('div');
  row.className = 'row' + (isNew ? ' new-entry' : '');
  row.dataset.id = e.id;
  row.innerHTML =
    \`<span class="r-id">#\${e.id}</span>\` +
    \`<span class="r-ts">\${e.ts}</span>\` +
    \`<span class="r-lvl lvl-\${e.level}">\${e.level}</span>\` +
    \`<span class="r-msg">\${e.context ? '<span class="ctx">'+esc(e.context)+'</span>' : ''}\${esc(e.message)}</span>\`;
  row.onclick = () => toggleRow(e, row);
  frag.appendChild(row);

  const det = document.createElement('div');
  det.className = 'detail';
  det.dataset.detailFor = e.id;
  det.innerHTML = buildDetail(e);
  frag.appendChild(det);

  return frag;
}

function buildDetail(e) {
  let html = '';
  html += row_d('ID',      '#' + e.id, true);
  html += row_d('Level',   e.level, true);
  html += row_d('Time',    e.ts + ' (' + e.elapsed + 'ms)');
  html += row_d('ISO',     e.tsISO);
  if (e.context) html += row_d('Context', e.context, true);
  html += row_d('Message', e.message, true);
  if (e.detail)  html += row_d('Detail',  e.detail);
  if (e.stack)   html += \`<div class="d-row"><span class="d-label">Stack</span><div><pre class="stack">\${esc(e.stack)}</pre></div></div>\`;
  return html;
}
function row_d(label, val, hi=false) {
  return \`<div class="d-row"><span class="d-label">\${label}</span><span class="d-val \${hi?'hi':''}">\${esc(String(val))}</span></div>\`;
}

function toggleRow(e, rowEl) {
  const area = document.getElementById('logArea');
  if (expandedId !== null && expandedId !== e.id) {
    const prev = area.querySelector(\`.row[data-id="\${expandedId}"]\`);
    if (prev) prev.classList.remove('expanded');
  }
  const isOpen = rowEl.classList.toggle('expanded');
  expandedId = isOpen ? e.id : null;
}

function updateStats() {
  const counts = { DEBUG:0, INFO:0, WARN:0, ERROR:0, FATAL:0 };
  allLogs.forEach(e => { if (counts[e.level] !== undefined) counts[e.level]++; });
  ['DEBUG','INFO','WARN','ERROR','FATAL'].forEach(l => {
    document.getElementById('c-' + l.toLowerCase()).textContent = counts[l];
  });
  document.getElementById('c-total').textContent = allLogs.length;
}

function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.f-btn').forEach(b => {
    const lvl = b.dataset.filter.toLowerCase();
    b.className = 'f-btn';
    if (b === btn) b.classList.add('active-' + lvl);
  });
  renderAll();
}

function setSearch(q) {
  search = q;
  renderAll();
}

function toggleAutoScroll() {
  autoScroll = !autoScroll;
  const btn = document.getElementById('asBtn');
  btn.classList.toggle('on', autoScroll);
  if (autoScroll) scrollBottom();
}

function scrollBottom() {
  const area = document.getElementById('logArea');
  area.scrollTop = area.scrollHeight;
}

function clearLogs() {
  fetch('/api/logs/clear', { method: 'POST' });
}

function copyAll() {
  const txt = allLogs.map(e =>
    \`[\${e.ts}] [\${e.level}] \${e.context ? '['+e.context+'] ' : ''}\${e.message}\${e.detail ? ' — '+e.detail : ''}\`
  ).join('\\n');
  navigator.clipboard.writeText(txt).then(() => flash('✓ Logs copied'));
}

function flash(msg) {
  const el = document.getElementById('lbl');
  const prev = el.textContent;
  el.textContent = msg;
  setTimeout(() => el.textContent = prev, 1800);
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

connect();
</script>
</body>
</html>`;
