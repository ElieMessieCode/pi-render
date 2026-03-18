import express, { Request, Response, NextFunction } from "express";
import { Visual } from "./types.js";
import { logger, addDebugClient, removeDebugClient } from "./logger.js";
import { DEBUG_PAGE } from "./debug-page.js";

export const PORT    = 3847;
export const BASE_URL = `http://localhost:${PORT}`;

const app = express();
app.use(express.json({ limit: "50mb" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms    = Date.now() - start;
    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "debug";
    logger[level](
      `${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`,
      "http",
    );
  });
  next();
});

export const history: Visual[] = [];
let   sseClients:    Response[] = [];
let   serverStarted              = false;
let   serverInstance: import("http").Server | null = null;

app.get("/sse", (req: Request, res: Response) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  sseClients.push(res);
  logger.debug(`SSE client connected (visuals) — total: ${sseClients.length}`, "sse");
  req.on("close", () => {
    sseClients = sseClients.filter(c => c !== res);
    logger.debug(`SSE client disconnected (visuals) — total: ${sseClients.length}`, "sse");
  });
});

app.get("/sse/debug", (req: Request, res: Response) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  addDebugClient(res);
  logger.debug("SSE client connected (debug)", "sse");
  req.on("close", () => {
    removeDebugClient(res);
    logger.debug("SSE client disconnected (debug)", "sse");
  });
});

export function broadcastVisuals(): void {
  const p = `data: ${JSON.stringify({ count: history.length })}\n\n`;
  sseClients.forEach(c => { try { c.write(p); } catch (e) {
    logger.warn("Cannot write to SSE visual client", "sse");
    sseClients = sseClients.filter(x => x !== c);
  }});
}

app.post("/add", (req: Request, res: Response) => {
  try {
    const v = req.body as Visual;
    if (!v || !v.id || !v.content) {
      logger.warn("POST /add: invalid payload", "server", JSON.stringify(req.body).slice(0, 200));
      res.status(400).json({ ok: false, error: "invalid payload" });
      return;
    }
    history.push(v);
    broadcastVisuals();
    logger.info(`Visual added: "${v.title}" (${history.length} total)`, "server");
    res.json({ ok: true });
  } catch (err) {
    logger.error("POST /add: unexpected error", "server", err);
    res.status(500).json({ ok: false, error: "internal error" });
  }
});

app.get("/api/history", (_: Request, res: Response) => {
  try {
    res.json(history);
  } catch (err) {
    logger.error("GET /api/history: error", "server", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/api/logs", (_: Request, res: Response) => {
  try {
    res.json(logger.getLogs());
  } catch (err) {
    logger.error("GET /api/logs: error", "server", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/api/logs/clear", (_: Request, res: Response) => {
  try {
    logger.clear();
    logger.info("Logs cleared by user", "server");
    res.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/logs/clear: error", "server", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/", (_: Request, res: Response) => {
  try { res.send(buildShell()); }
  catch (err) { logger.error("GET /: error", "server", err); res.status(500).send("Internal error"); }
});

app.get("/debug", (_: Request, res: Response) => {
  try { res.send(DEBUG_PAGE); }
  catch (err) { logger.error("GET /debug: error", "server", err); res.status(500).send("Internal error"); }
});

app.use((req: Request, res: Response) => {
  logger.warn(`404 — ${req.method} ${req.path}`, "server");
  res.status(404).json({ error: `Unknown route: ${req.method} ${req.path}` });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Express error handler — ${req.method} ${req.path}: ${err.message}`, "server", err);
  res.status(500).json({ error: err.message || "internal error" });
});

export function startServer(): Promise<void> {
  if (serverStarted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = app.listen(PORT, () => {
      serverStarted  = true;
      serverInstance = s;
      logger.info(`Server started → http://localhost:${PORT}`, "server");
      logger.info(`Debug available → http://localhost:${PORT}/debug`, "server");
      resolve();
    });
    s.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "EADDRINUSE") {
        logger.warn(`Port ${PORT} already in use — server assumed active`, "server");
        serverStarted = true;
        resolve();
      } else {
        logger.fatal(`Cannot start server: ${e.message}`, "server", e);
        reject(e);
      }
    });
    s.on("close", () => {
      logger.info("HTTP server closed", "server");
    });
  });
}

export function closeServer(): Promise<void> {
  logger.info("Closing server...", "server");
  return new Promise((resolve) => {
    sseClients.forEach(c => { try { c.end(); } catch {} });
    sseClients = [];
    logger.debug("Visual SSE clients closed", "server");

    if (!serverInstance) {
      logger.debug("No active server instance", "server");
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      logger.warn("Server close timeout (2s) — forcing", "server");
      serverStarted  = false;
      serverInstance = null;
      resolve();
    }, 2000);

    serverInstance.close(() => {
      clearTimeout(timeout);
      serverStarted  = false;
      serverInstance = null;
      logger.info("Server closed properly", "server");
      resolve();
    });
  });
}

function shutdown(signal: string): void {
  logger.warn(`Signal received: ${signal} — shutting down`, "process");
  closeServer().finally(() => {
    logger.info("Bye 👋", "process");
    process.exit(0);
  });
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", () => {
  sseClients.forEach(c => { try { c.end(); } catch {} });
  serverInstance?.close();
});

function buildShell(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pi-render</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0d14;--surface:#111520;--card:#161c2e;--card-hover:#1a2236;
  --border:#1e2a42;--border-hi:#2a3a58;
  --accent:#1db97e;--accent-dim:rgba(29,185,126,0.12);--accent-glow:rgba(29,185,126,0.3);
  --ink:#dde3f0;--muted:#7a869e;--hint:#3d4d6a;
  --amber:#e09b3d;--blue:#4da6ff;--red:#e05c7a;--purple:#a78bfa;
}
html,body{min-height:100%;background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border-hi);border-radius:3px}
.hdr{position:sticky;top:0;z-index:200;background:rgba(10,13,20,0.9);backdrop-filter:blur(18px);border-bottom:0.5px solid var(--border);height:52px;padding:0 1.25rem;display:flex;align-items:center;gap:12px;}
.logo{font-size:14px;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:8px}
.logo-box{width:26px;height:26px;border-radius:7px;background:var(--accent-dim);border:0.5px solid var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:13px;}
.logo em{color:var(--muted);font-style:normal;font-weight:400}
.hdr-gap{flex:1}
.hdr-pill{font-size:10px;font-weight:500;padding:3px 10px;border-radius:20px;background:var(--surface);border:0.5px solid var(--border);color:var(--muted);}
.live{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent-glow);animation:blink 2.5s ease infinite}
.dot.off{background:var(--hint);box-shadow:none;animation:none}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.debug-link{font-size:10px;color:var(--hint);text-decoration:none;padding:3px 10px;border-radius:5px;border:0.5px solid var(--border);transition:all .15s;display:flex;align-items:center;gap:4px}
.debug-link:hover{color:var(--muted);border-color:var(--border-hi)}
#empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 52px);gap:14px;padding:2rem;text-align:center;}
.ei{width:68px;height:68px;border-radius:18px;background:var(--accent-dim);border:0.5px solid var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:30px}
#empty h2{font-size:20px;font-weight:700;letter-spacing:-.02em}
#empty p{font-size:13px;color:var(--muted);max-width:360px;line-height:1.75}
.mono{font-family:'Source Code Pro',monospace;font-size:11px;background:var(--surface);border:0.5px solid var(--border);padding:4px 12px;border-radius:6px;color:var(--accent);display:inline-block;margin-top:4px}
#feed{max-width:1040px;margin:0 auto;padding:1.25rem 1.25rem 5rem;display:none}
.vb{background:var(--card);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:.875rem;animation:up .3s cubic-bezier(.16,1,.3,1);transition:border-color .2s;}
.vb:hover{border-color:var(--border-hi)}.vb.latest{border-color:var(--accent-glow)}
@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.vb-hd{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .15s;user-select:none;}
.vb-hd:hover{background:var(--card-hover)}
.vb-title{font-size:13px;font-weight:600;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.vb-time{font-size:10px;color:var(--hint);font-family:'Source Code Pro',monospace;flex-shrink:0}
.vb-latest{font-size:9px;font-weight:700;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;background:var(--accent-dim);border:0.5px solid var(--accent-glow);padding:2px 8px;border-radius:20px;flex-shrink:0}
.arr{color:var(--hint);font-size:9px;flex-shrink:0;transition:transform .25s cubic-bezier(.16,1,.3,1)}.arr.open{transform:rotate(180deg)}
.vb-body{border-top:0.5px solid var(--border)}.vb-body.hidden{display:none}
.tb{display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface);border-bottom:0.5px solid var(--border)}
.btn{font-size:10px;font-weight:500;padding:3px 10px;border-radius:5px;background:transparent;border:0.5px solid var(--border);color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;display:flex;align-items:center;gap:4px;}
.btn:hover{background:var(--card);color:var(--ink);border-color:var(--border-hi)}
.btn.dl{color:var(--accent);border-color:var(--accent-glow);background:var(--accent-dim)}.btn.dl:hover{background:var(--accent);color:#fff}
.tb-info{margin-left:auto;font-size:10px;color:var(--hint);font-family:'Source Code Pro',monospace}
.iframe-zone{width:100%;background:#fff}
iframe{width:100%;border:none;display:block}
#toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(70px);background:var(--card);border:0.5px solid var(--border);border-radius:10px;padding:8px 18px;font-size:12px;color:var(--ink);opacity:0;transition:all .3s cubic-bezier(.16,1,.3,1);pointer-events:none;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,.5);}
#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
<header class="hdr">
  <div class="logo"><div class="logo-box">🎨</div>pi<em>-render</em></div>
  <div class="hdr-gap"></div>
  <div class="live"><div class="dot" id="dot"></div><span id="lbl">live</span></div>
  <a href="/debug" class="debug-link" target="_blank">🐛 debug</a>
  <div class="hdr-pill" id="cnt">0 visual</div>
</header>
<div id="empty">
  <div class="ei">🎨</div>
  <h2>Waiting for visuals…</h2>
  <p>Ask a question in the terminal. pi-agent will generate interactive HTML pages that appear here.</p>
  <code class="mono">render_visual(title, content)</code>
</div>
<div id="feed"></div>
<div id="toast"></div>
<script>
let visuals=[],expanded=new Set(),toastT;
function connect(){const e=new EventSource('/sse');e.onopen=()=>setLive(true);e.onmessage=()=>sync();e.onerror=()=>{setLive(false);setTimeout(connect,3000)};}
function setLive(ok){document.getElementById('dot').className=ok?'dot':'dot off';document.getElementById('lbl').textContent=ok?'live':'reconnecting…';}
async function sync(){
  const data=await fetch('/api/history').then(r=>r.json());
  const isNew=data.length>visuals.length;
  if(isNew&&data.length>0) expanded.add(data[data.length-1].id);
  visuals=data;paint();
  if(isNew&&visuals.length>0) requestAnimationFrame(()=>{const els=document.querySelectorAll('.vb');els.length&&els[els.length-1].scrollIntoView({behavior:'smooth',block:'nearest'});});
}
function paint(){
  const n=visuals.length;
  document.getElementById('cnt').textContent=n+' visual'+(n>1?'s':'');
  document.getElementById('empty').style.display=n?'none':'flex';
  const feed=document.getElementById('feed');feed.style.display=n?'block':'none';
  if(!n)return;
  feed.innerHTML=visuals.map((v,i)=>block(v,i===n-1)).join('');
  visuals.forEach(v=>expanded.has(v.id)&&injectIframe(v));
}
function block(v,isLast){const open=expanded.has(v.id);return \`<div class="vb\${isLast?' latest':''}" id="vb-\${v.id}"><div class="vb-hd" onclick="toggle('\${v.id}')"><svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0;opacity:.5"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor"/></svg><span class="vb-title">\${esc(v.title)}</span>\${isLast?'<span class="vb-latest">▶ LATEST</span>':''}<span class="vb-time">\${v.timestamp}</span><span class="arr \${open?'open':''}" id="arr-\${v.id}">▼</span></div><div class="vb-body \${open?'':'hidden'}" id="bd-\${v.id}"><div class="tb"><button class="btn" onclick="copySrc('\${v.id}')">⎘ Copy HTML</button><button class="btn dl" onclick="download('\${v.id}')">⬇ Download</button><button class="btn" onclick="openTab('\${v.id}')">↗ New Tab</button><span class="tb-info">\${v.filePath?'💾 '+v.filePath.split('/').slice(-1)[0]:''}</span></div><div class="iframe-zone" id="iz-\${v.id}"></div></div></div>\`;}
function toggle(id){const bd=document.getElementById('bd-'+id),arr=document.getElementById('arr-'+id),open=!bd.classList.contains('hidden');bd.classList.toggle('hidden');arr.classList.toggle('open');if(!open){expanded.add(id);injectIframe(visuals.find(v=>v.id===id));}else expanded.delete(id);}
function injectIframe(v){if(!v)return;const zone=document.getElementById('iz-'+v.id);if(!zone||zone.querySelector('iframe'))return;const iframe=document.createElement('iframe');iframe.sandbox='allow-scripts allow-same-origin allow-forms';iframe.onload=()=>{try{const h=iframe.contentDocument.documentElement.scrollHeight;iframe.style.height=Math.max(h,80)+'px';}catch(e){}};zone.appendChild(iframe);const blob=new Blob([v.content],{type:'text/html'});iframe.src=URL.createObjectURL(blob);}
function copySrc(id){const v=visuals.find(x=>x.id===id);if(!v)return;navigator.clipboard.writeText(v.content).then(()=>toast('✓ HTML copied'));}
function download(id){const v=visuals.find(x=>x.id===id);if(!v)return;const a=document.createElement('a');const blob=new Blob([v.content],{type:'text/html'});a.href=URL.createObjectURL(blob);a.download=(v.filePath?v.filePath.split('/').slice(-1)[0]:slug(v.title)+'.html');a.click();URL.revokeObjectURL(a.href);toast('⬇ '+a.download);}
function openTab(id){const v=visuals.find(x=>x.id===id);if(!v)return;const blob=new Blob([v.content],{type:'text/html'});window.open(URL.createObjectURL(blob),'_blank');}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'render';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2500);}
connect();sync();
</script>
</body>
</html>`;
}
