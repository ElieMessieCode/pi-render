import express, { Request, Response, NextFunction } from "express";
import { Visual } from "./types.js";
import { logger, addDebugClient, removeDebugClient } from "./logger.js";
import { DEBUG_PAGE } from "./debug-page.js";

export const PORT     = 3847;
export const BASE_URL = `http://localhost:${PORT}`;

const app = express();
app.use(express.json({ limit: "50mb" }));

// ── Middleware log HTTP ───────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms  = Date.now() - start;
    const lvl = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "debug";
    logger[lvl](`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`, "http");
  });
  next();
});

// ── State ─────────────────────────────────────────────────────────────────────
export const history: Visual[] = [];
let sseClients:    Response[] = [];
let serverStarted              = false;
let serverInstance: import("http").Server | null = null;

// ── SSE visuels ───────────────────────────────────────────────────────────────
app.get("/sse", (req: Request, res: Response) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  sseClients.push(res);
  logger.debug(`SSE visuel connecté — total: ${sseClients.length}`, "sse");
  req.on("close", () => {
    sseClients = sseClients.filter(c => c !== res);
    logger.debug(`SSE visuel déconnecté — total: ${sseClients.length}`, "sse");
  });
});

// ── SSE debug ─────────────────────────────────────────────────────────────────
app.get("/sse/debug", (req: Request, res: Response) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  addDebugClient(res);
  logger.debug("SSE debug connecté", "sse");
  req.on("close", () => { removeDebugClient(res); logger.debug("SSE debug déconnecté", "sse"); });
});

export function broadcastVisuals(): void {
  const p = `data: ${JSON.stringify({ count: history.length })}\n\n`;
  sseClients.forEach(c => { try { c.write(p); } catch { sseClients = sseClients.filter(x => x !== c); } });
}

// ── Routes API ────────────────────────────────────────────────────────────────
app.post("/add", (req: Request, res: Response) => {
  try {
    const v = req.body as Visual;
    if (!v?.id || !v?.content) { res.status(400).json({ ok: false, error: "payload invalide" }); return; }
    history.push(v);
    broadcastVisuals();
    logger.info(`Visuel ajouté : "${v.title}" (#${history.length})`, "server");
    res.json({ ok: true });
  } catch (err) {
    logger.error("POST /add erreur", "server", err);
    res.status(500).json({ ok: false, error: "erreur interne" });
  }
});

app.get("/api/history", (_: Request, res: Response) => {
  try { res.json(history); }
  catch (err) { logger.error("GET /api/history", "server", err); res.status(500).json({ error: "erreur interne" }); }
});

app.get("/api/logs", (_: Request, res: Response) => {
  try { res.json(logger.getLogs()); }
  catch (err) { res.status(500).json({ error: "erreur interne" }); }
});

app.post("/api/logs/clear", (_: Request, res: Response) => {
  logger.clear();
  logger.info("Logs vidés", "server");
  res.json({ ok: true });
});

// ── Pages ─────────────────────────────────────────────────────────────────────
app.get("/",       (_: Request, res: Response) => { res.send(buildShell()); });
app.get("/debug",  (_: Request, res: Response) => { res.send(DEBUG_PAGE); });
app.use((req: Request, res: Response) => {
  logger.warn(`404 — ${req.method} ${req.path}`, "server");
  res.status(404).json({ error: `Route inconnue : ${req.method} ${req.path}` });
});
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Express error — ${req.path} : ${err.message}`, "server", err);
  res.status(500).json({ error: err.message });
});

// ── Start / Close ─────────────────────────────────────────────────────────────
export function startServer(): Promise<void> {
  if (serverStarted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = app.listen(PORT, () => {
      serverStarted = true; serverInstance = s;
      logger.info(`Serveur démarré → ${BASE_URL}`, "server");
      logger.info(`Debug → ${BASE_URL}/debug`, "server");
      resolve();
    });
    s.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "EADDRINUSE") { logger.warn(`Port ${PORT} déjà utilisé`, "server"); serverStarted = true; resolve(); }
      else { logger.fatal(`Erreur serveur : ${e.message}`, "server", e); reject(e); }
    });
    s.on("close", () => logger.info("Serveur HTTP fermé", "server"));
  });
}

export function closeServer(): Promise<void> {
  logger.info("Fermeture serveur…", "server");
  return new Promise(resolve => {
    sseClients.forEach(c => { try { c.end(); } catch {} });
    sseClients = [];
    if (!serverInstance) { resolve(); return; }
    const timeout = setTimeout(() => {
      logger.warn("Timeout fermeture (2s) — forçage", "server");
      serverStarted = false; serverInstance = null; resolve();
    }, 2000);
    serverInstance.close(() => {
      clearTimeout(timeout); serverStarted = false; serverInstance = null;
      logger.info("Serveur fermé proprement", "server"); resolve();
    });
  });
}

// ── Signaux OS ────────────────────────────────────────────────────────────────
function shutdown(sig: string) {
  logger.warn(`Signal ${sig} — fermeture`, "process");
  closeServer().finally(() => process.exit(0));
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", () => { sseClients.forEach(c => { try { c.end(); } catch {} }); serverInstance?.close(); });

// ─────────────────────────────────────────────────────────────────────────────
// SHELL HTML — Charte graphique pi exacte
// ─────────────────────────────────────────────────────────────────────────────
function buildShell(): string {
  return /* html */`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pi-render</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
/* ── Pi Design System ─────────────────────────────────────────────────────── */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:       #1a1a18;
  --surface:  rgba(26,26,24,0.8);
  --fg:       #f5f2ee;
  --muted:    #b8b4ae;
  --border:   #2a2820;
  --primary:  #b75939;
  --primary-l:#d47254;
  --primary-h:#c96842;
  --accent:   #d4a574;
  --cream:    #e8c49a;
  --subtle:   #7a7670;
  --faint:    #5a5650;
}

html,body{
  min-height:100%;
  background-color:var(--bg);
  background-image:
    linear-gradient(rgba(245,242,238,0.12) 1px,transparent 1px),
    linear-gradient(90deg,rgba(245,242,238,0.12) 1px,transparent 1px);
  background-size:48px 48px;
  color:var(--fg);
  font-family:'Inter',sans-serif;
  font-size:14px;
  line-height:1.6;
}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--primary)}

/* ── Glass ───────────────────────────────────────────────────────────────── */
.glass{
  background:rgba(255,255,255,0.03);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(183,89,57,0.12);
}
.glass-hover{transition:border-color .25s,box-shadow .25s,background .25s}
.glass-hover:hover{
  background:rgba(255,255,255,0.05);
  border-color:rgba(183,89,57,0.35);
  box-shadow:0 0 28px rgba(183,89,57,0.12),inset 0 1px 0 rgba(255,255,255,0.05);
}

/* ── Glow ────────────────────────────────────────────────────────────────── */
.glow-sm{box-shadow:0 0 16px rgba(183,89,57,0.30)}
.glow-text{text-shadow:0 0 24px rgba(183,89,57,0.55)}

/* ── Gradient text ───────────────────────────────────────────────────────── */
.gradient-text{
  background:linear-gradient(120deg,#b75939 0%,#d4a574 45%,#e8c49a 60%,#b75939 100%);
  background-size:200% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:shimmer 4s linear infinite;
}
@keyframes shimmer{to{background-position:200% center}}

/* ── Navbar ──────────────────────────────────────────────────────────────── */
.nav{
  position:sticky;top:0;z-index:100;
  background:rgba(26,26,24,0.85);
  backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,0.06);
  height:52px;padding:0 1.25rem;
  display:flex;align-items:center;gap:12px;
}
.nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.nav-logo-icon{
  width:28px;height:28px;border-radius:8px;
  background:var(--primary);display:flex;align-items:center;justify-content:center;
  font-size:14px;box-shadow:0 0 16px rgba(183,89,57,.3);
}
.nav-logo-text{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--fg)}
.nav-logo-badge{
  font-family:'JetBrains Mono',monospace;font-size:9px;
  border:1px solid rgba(183,89,57,.3);background:rgba(183,89,57,.1);
  color:var(--primary);padding:2px 7px;border-radius:20px;
}
.nav-gap{flex:1}
.nav-link{
  font-size:11px;color:var(--subtle);text-decoration:none;
  padding:4px 10px;border-radius:7px;border:1px solid var(--border);
  transition:all .15s;font-family:'JetBrains Mono',monospace;
}
.nav-link:hover{color:var(--fg);border-color:rgba(183,89,57,.4)}
.nav-count{
  font-family:'JetBrains Mono',monospace;font-size:10px;
  color:var(--muted);background:rgba(255,255,255,0.03);
  border:1px solid var(--border);padding:3px 10px;border-radius:20px;
}
.live-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--primary);
  box-shadow:0 0 10px rgba(183,89,57,.6);
  animation:pulse-glow 2.5s ease infinite;
}
.live-dot.off{background:var(--faint);box-shadow:none;animation:none}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 8px rgba(183,89,57,.4)}50%{box-shadow:0 0 24px rgba(183,89,57,.8)}}
.live-wrap{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--subtle)}

/* ── Empty ───────────────────────────────────────────────────────────────── */
#empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:calc(100vh - 52px);gap:16px;padding:2rem;text-align:center;
}
.empty-icon{
  width:72px;height:72px;border-radius:20px;
  background:rgba(183,89,57,.1);border:1px solid rgba(183,89,57,.2);
  display:flex;align-items:center;justify-content:center;font-size:32px;
  box-shadow:0 0 40px rgba(183,89,57,.15);
}
#empty h2{font-size:22px;font-weight:900;color:var(--fg);letter-spacing:-.02em}
#empty p{font-size:13px;color:var(--muted);max-width:380px;line-height:1.75}
.mono-pill{
  font-family:'JetBrains Mono',monospace;font-size:11px;
  background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);
  color:var(--primary);padding:4px 14px;border-radius:8px;
  display:inline-block;margin-top:4px;
}

/* ── Feed ────────────────────────────────────────────────────────────────── */
#feed{max-width:1040px;margin:0 auto;padding:1.25rem 1.25rem 5rem;display:none}

/* ── Visual block ────────────────────────────────────────────────────────── */
.vb{
  background:rgba(255,255,255,0.02);
  border:1px solid rgba(183,89,57,0.10);
  border-radius:16px;overflow:hidden;margin-bottom:1rem;
  animation:slide-up .35s cubic-bezier(.16,1,.3,1);
  transition:border-color .2s,box-shadow .2s;
}
.vb:hover{border-color:rgba(183,89,57,0.25);box-shadow:0 0 20px rgba(183,89,57,.06)}
.vb.latest{border-color:rgba(183,89,57,0.4);box-shadow:0 0 32px rgba(183,89,57,.12)}
@keyframes slide-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

.vb-hd{
  display:flex;align-items:center;gap:10px;
  padding:11px 16px;cursor:pointer;
  background:rgba(255,255,255,0.01);
  transition:background .15s;user-select:none;
}
.vb-hd:hover{background:rgba(255,255,255,0.03)}

.vb-icon{
  width:28px;height:28px;border-radius:8px;flex-shrink:0;
  background:rgba(183,89,57,.1);border:1px solid rgba(183,89,57,.2);
  display:flex;align-items:center;justify-content:center;font-size:12px;
}
.vb-title{font-size:13px;font-weight:600;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--fg)}
.vb-time{font-size:10px;color:var(--faint);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.vb-latest-badge{
  font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;
  color:var(--primary);background:rgba(183,89,57,.12);
  border:1px solid rgba(183,89,57,.3);padding:2px 8px;border-radius:20px;flex-shrink:0;
}
.arr{color:var(--faint);font-size:9px;flex-shrink:0;transition:transform .25s cubic-bezier(.16,1,.3,1)}
.arr.open{transform:rotate(180deg)}
.vb-body{border-top:1px solid rgba(255,255,255,0.05)}
.vb-body.hidden{display:none}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.tb{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  padding:7px 14px;
  background:rgba(0,0,0,.2);
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.tb-btn{
  font-size:10px;font-weight:500;padding:4px 11px;border-radius:7px;
  background:transparent;border:1px solid var(--border);
  color:var(--subtle);cursor:pointer;
  font-family:'Inter',sans-serif;
  transition:all .15s;display:flex;align-items:center;gap:4px;
}
.tb-btn:hover{background:rgba(255,255,255,.04);color:var(--fg);border-color:rgba(255,255,255,.12)}
.tb-btn.primary{color:var(--primary);border-color:rgba(183,89,57,.3);background:rgba(183,89,57,.08)}
.tb-btn.primary:hover{background:var(--primary);color:#fff;border-color:var(--primary)}
.tb-info{margin-left:auto;font-size:10px;color:var(--faint);font-family:'JetBrains Mono',monospace}

/* ── iFrame ──────────────────────────────────────────────────────────────── */
.iframe-zone{width:100%}
iframe{width:100%;border:none;display:block;background:#1a1a18}

/* ── Toast ───────────────────────────────────────────────────────────────── */
#toast{
  position:fixed;bottom:1.5rem;left:50%;
  transform:translateX(-50%) translateY(70px);
  background:rgba(26,26,24,.95);
  border:1px solid rgba(183,89,57,.3);border-radius:12px;
  padding:8px 18px;font-size:12px;font-weight:500;color:var(--fg);
  opacity:0;transition:all .3s cubic-bezier(.16,1,.3,1);
  pointer-events:none;z-index:999;
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 20px rgba(183,89,57,.1);
}
#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>

<!-- Nav -->
<nav class="nav">
  <a class="nav-logo" href="/">
    <div class="nav-logo-icon">⚡</div>
    <span class="nav-logo-text">pi-render</span>
    <span class="nav-logo-badge">v3</span>
  </a>
  <div class="nav-gap"></div>
  <div class="live-wrap"><div class="live-dot" id="dot"></div><span id="lbl">en direct</span></div>
  <a href="/debug" class="nav-link" target="_blank">🐛 debug</a>
  <div class="nav-count" id="cnt">0 visuel</div>
</nav>

<!-- Empty -->
<div id="empty">
  <div class="empty-icon">⚡</div>
  <h2>En attente de visuels…</h2>
  <p>Pose une question à pi-agent dans le terminal.<br>Il générera des pages HTML dans la charte pi qui apparaîtront ici.</p>
  <code class="mono-pill">render_visual(title, content)</code>
</div>

<!-- Feed -->
<div id="feed"></div>
<div id="toast"></div>

<script>
let visuals=[], expanded=new Set(), toastT;

function connect(){
  const e=new EventSource('/sse');
  e.onopen=()=>setLive(true);
  e.onmessage=()=>sync();
  e.onerror=()=>{setLive(false);setTimeout(connect,3000)};
}
function setLive(ok){
  document.getElementById('dot').className=ok?'live-dot':'live-dot off';
  document.getElementById('lbl').textContent=ok?'en direct':'reconnexion…';
}
async function sync(){
  const data=await fetch('/api/history').then(r=>r.json());
  const isNew=data.length>visuals.length;
  if(isNew&&data.length>0) expanded.add(data[data.length-1].id);
  visuals=data;paint();
  if(isNew&&visuals.length>0) requestAnimationFrame(()=>{
    const els=document.querySelectorAll('.vb');
    els.length&&els[els.length-1].scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}
function paint(){
  const n=visuals.length;
  document.getElementById('cnt').textContent=n+' visuel'+(n>1?'s':'');
  document.getElementById('empty').style.display=n?'none':'flex';
  const feed=document.getElementById('feed');
  feed.style.display=n?'block':'none';
  if(!n)return;
  feed.innerHTML=visuals.map((v,i)=>block(v,i===n-1)).join('');
  visuals.forEach(v=>expanded.has(v.id)&&injectIframe(v));
}
function block(v,isLast){
  const open=expanded.has(v.id);
  return \`<div class="vb\${isLast?' latest':''}" id="vb-\${v.id}">
  <div class="vb-hd" onclick="toggle('\${v.id}')">
    <div class="vb-icon">⚡</div>
    <span class="vb-title">\${esc(v.title)}</span>
    \${isLast?'<span class="vb-latest-badge">▶ LATEST</span>':''}
    <span class="vb-time">\${v.timestamp}</span>
    <span class="arr \${open?'open':''}" id="arr-\${v.id}">▼</span>
  </div>
  <div class="vb-body \${open?'':'hidden'}" id="bd-\${v.id}">
    <div class="tb">
      <button class="tb-btn" onclick="copySrc('\${v.id}')">⎘ HTML</button>
      <button class="tb-btn primary" onclick="download('\${v.id}')">⬇ Télécharger</button>
      <button class="tb-btn" onclick="openTab('\${v.id}')">↗ Plein écran</button>
      <span class="tb-info">\${v.filePath?'💾 '+v.filePath.split(/[/\\\\]/).pop():''}</span>
    </div>
    <div class="iframe-zone" id="iz-\${v.id}"></div>
  </div>
</div>\`;}
function toggle(id){
  const bd=document.getElementById('bd-'+id),arr=document.getElementById('arr-'+id);
  const open=!bd.classList.contains('hidden');
  bd.classList.toggle('hidden');arr.classList.toggle('open');
  if(!open){expanded.add(id);injectIframe(visuals.find(v=>v.id===id));}
  else expanded.delete(id);
}
function injectIframe(v){
  if(!v)return;
  const zone=document.getElementById('iz-'+v.id);
  if(!zone||zone.querySelector('iframe'))return;
  const iframe=document.createElement('iframe');
  iframe.sandbox='allow-scripts allow-same-origin allow-forms';
  iframe.onload=()=>{try{const h=iframe.contentDocument.documentElement.scrollHeight;iframe.style.height=Math.max(h,120)+'px';}catch(e){}};
  zone.appendChild(iframe);
  const blob=new Blob([v.content],{type:'text/html'});
  iframe.src=URL.createObjectURL(blob);
}
function copySrc(id){
  const v=visuals.find(x=>x.id===id);if(!v)return;
  navigator.clipboard.writeText(v.content).then(()=>toast('✓ HTML copié'));
}
function download(id){
  const v=visuals.find(x=>x.id===id);if(!v)return;
  const a=document.createElement('a');
  const blob=new Blob([v.content],{type:'text/html'});
  a.href=URL.createObjectURL(blob);
  a.download=(v.filePath?v.filePath.split(/[/\\\\]/).pop():slug(v.title)+'.html');
  a.click();URL.revokeObjectURL(a.href);
  toast('⬇ '+a.download);
}
function openTab(id){
  const v=visuals.find(x=>x.id===id);if(!v)return;
  const blob=new Blob([v.content],{type:'text/html'});
  window.open(URL.createObjectURL(blob),'_blank');
}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'render';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('on');
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2500);
}
connect();sync();
</script>
</body>
</html>`;
}
