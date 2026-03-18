import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { 
  ExtensionAPI, 
  ContextEvent,
  ExtensionContext,
  Visual 
} from "./types.js";
import { startServer, closeServer, PORT, BASE_URL, history } from "./server.js";
import { openBrowser } from "./browser.js";
import { logger } from "./logger.js";

const RENDERS_DIR = path.join(os.homedir(), ".pi", "agent", "renders");

function ensureRendersDir(): void {
  try {
    fs.mkdirSync(RENDERS_DIR, { recursive: true });
  } catch (err) {
    logger.error(`Failed to create ${RENDERS_DIR}`, "fs", err);
    throw err;
  }
}

function saveHtmlFile(title: string, html: string, isoDate: string): string {
  ensureRendersDir();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "render";
  const ts       = isoDate.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const filename = `${ts}_${slug}.html`;
  const filePath = path.join(RENDERS_DIR, filename);
  fs.writeFileSync(filePath, html, "utf-8");
  logger.debug(`File saved: ${filePath}`, "fs");
  return filePath;
}

const SYSTEM_PROMPT = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  PI-RENDER ACTIVE — Visualization Instructions                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

You have access to render_visual(title, content) which displays an interactive
HTML page in the user's browser AND auto-saves it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHEN TO CALL render_visual — ALWAYS WHEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• User asks for explanation → page with sections, cards, timeline
• There's data to compare → table, SVG chart, bars, curves
• There's architecture/flow → SVG diagram with boxes and arrows
• There's code to show → block with CSS syntax highlighting
• There's a concept to teach → interactive course with tabs, examples, quiz
• There's analysis results → dashboard with metrics, charts, summary
• Response is long → structure it as a page with internal navigation
• User says "show", "display", "create", "generate", "visualize"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE CODE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ALLOWED:
  • HTML5 + CSS3 inline (in <style> in <head>)
  • Inline SVG for charts, diagrams, icons, illustrations
  • Minimal vanilla JavaScript for interactivity (tabs, toggles, filters)
  • Google Fonts via @import url('https://fonts.googleapis.com/...')
  • CSS animations (@keyframes, transitions, transforms)
  • CSS variables, Grid, Flexbox, clamp(), calc()
  • data: URIs for small images

❌ FORBIDDEN:
  • No external libraries (no Chart.js, D3, Bootstrap, React, Vue...)
  • No CDNs except Google Fonts
  • No fetch() to external APIs
  • No localStorage/sessionStorage (not supported in sandboxed iframe)
  • No import/require of modules
  • No external images (<img src="http://...">)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED PAGE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Title</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Source+Code+Pro:wght@400;500&display=swap');
  :root {
    --bg:#0a0d14; --surface:#111520; --card:#161c2e; --border:#1e2a42;
    --accent:#1db97e; --accent-dim:rgba(29,185,126,0.12);
    --ink:#dde3f0; --muted:#7a869e; --hint:#3d4d6a;
    --amber:#e09b3d; --blue:#4da6ff; --red:#e05c7a; --purple:#a78bfa;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;line-height:1.7}
</style>
</head>
<body>
  <!-- Structured content -->
  <script>/* Vanilla JS only if needed */</script>
</body>
</html>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED COMPONENTS & PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── BAR CHART (SVG) ──
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <line x1="40" y1="10" x2="40" y2="160" stroke="var(--border)" stroke-width="0.5"/>
  <rect x="60" y="60" width="40" height="100" rx="4" fill="var(--accent)" opacity="0.85"/>
  <text x="80" y="175" text-anchor="middle" font-size="11" fill="var(--muted)">Jan</text>
  <text x="80" y="52" text-anchor="middle" font-size="11" fill="var(--ink)" font-weight="600">120</text>
</svg>

── LINE CHART (SVG) ──
<svg viewBox="0 0 400 180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="var(--accent)" stop-opacity=".3"/>
    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
  </linearGradient></defs>
  <path d="M40,120 C80,80 120,60 160,70 S240,50 280,40 S340,30 380,35"
        stroke="var(--accent)" stroke-width="2" fill="none"/>
  <path d="M40,120 C80,80 120,60 160,70 S240,50 280,40 S340,30 380,35 L380,160 L40,160Z"
        fill="url(#g)"/>
</svg>

── PIE CHART (SVG stroke-dasharray) ──
<svg viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="45" fill="none" stroke="var(--accent)"
    stroke-width="20" stroke-dasharray="113 170" transform="rotate(-90 60 60)"/>
  <circle cx="60" cy="60" r="45" fill="none" stroke="var(--blue)"
    stroke-width="20" stroke-dasharray="57 226" stroke-dashoffset="-113" transform="rotate(-90 60 60)"/>
</svg>

── FLOW DIAGRAM (SVG) ──
<svg viewBox="0 0 400 300">
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3z" fill="var(--muted)"/>
  </marker></defs>
  <rect x="10" y="120" width="100" height="40" rx="8" fill="var(--card)" stroke="var(--border)"/>
  <text x="60" y="145" text-anchor="middle" font-size="12" fill="var(--ink)">Step 1</text>
  <line x1="110" y1="140" x2="145" y2="140" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#arr)"/>
</svg>

── TABS (CSS-only with radio inputs) ──
<input type="radio" id="t1" name="tab" checked hidden>
<input type="radio" id="t2" name="tab" hidden>
<div class="tab-nav">
  <label for="t1">Tab 1</label>
  <label for="t2">Tab 2</label>
</div>
<div class="panels">
  <div class="panel" id="p1">Content 1</div>
  <div class="panel" id="p2">Content 2</div>
</div>
<style>
.panel{display:none}
#t1:checked~.panels #p1,#t2:checked~.panels #p2{display:block}
#t1:checked~.tab-nav label[for="t1"],#t2:checked~.tab-nav label[for="t2"]{color:var(--accent);border-bottom-color:var(--accent)}
</style>

── ACCORDION (native HTML) ──
<details><summary>Title</summary><div>Content</div></details>

── CARD GRID ──
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
  <div style="background:var(--card);border:0.5px solid var(--border);border-radius:12px;padding:1.25rem">
    <div style="font-size:24px;margin-bottom:8px">🚀</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:6px">Title</div>
    <div style="font-size:13px;color:var(--muted)">Description</div>
  </div>
</div>

── CODE BLOCK CSS HIGHLIGHTING ──
<pre style="background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:1.25rem;overflow-x:auto">
<code style="font-family:'Source Code Pro',monospace;font-size:12.5px;line-height:1.75">
<span style="color:#a78bfa">const</span> <span style="color:#4da6ff">x</span> = <span style="color:#1db97e">42</span>;
</code></pre>

── TIMELINE ──
<div style="position:relative;padding-left:2rem">
  <div style="position:absolute;left:.5rem;top:0;bottom:0;width:0.5px;background:var(--border)"></div>
  <div style="position:relative;margin-bottom:1.5rem">
    <div style="position:absolute;left:-1.75rem;top:4px;width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)"></div>
    <div style="font-size:11px;color:var(--muted)">2024-01</div>
    <div style="font-size:14px;font-weight:500">Event</div>
  </div>
</div>

── METRIC / KPI ──
<div style="text-align:center;padding:1.5rem">
  <div style="font-size:36px;font-weight:700;color:var(--accent)">98.7%</div>
  <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">Uptime</div>
  <div style="font-size:11px;color:var(--hint)">↑ +2.1% vs last month</div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEST PRACTICE: ONE PAGE = MULTIPLE SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A single render_visual() call can contain:
  • Header with title + badges
  • KPI metrics at top
  • SVG chart in center
  • Data table at bottom
  • Recommendation cards
  → It's ONE single HTML page, rich and complete.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
/* countUp : JS vanilla — let i=0; const t=setInterval(()=>{el.textContent=Math.round(i+=target/60);if(i>=target)clearInterval(t)},16) */
`.trim();

let browserOpened = false;

export default function piRender(api: ExtensionAPI): void {
  logger.info("pi-render extension started", "init");

  // Inject system prompt into LLM context
  api.on("context", (event: ContextEvent, _ctx: ExtensionContext) => {
    try {
      const messages = [...event.messages];
      const alreadyInjected = messages.some(m =>
        typeof m.content === "string" && (m.content as string).includes("PI-RENDER ACTIVE")
      );
      if (!alreadyInjected) {
        messages.unshift({ 
          role: "user", 
          content: SYSTEM_PROMPT, 
          timestamp: Date.now() 
        });
        logger.debug("System prompt injected into LLM context", "context");
      }
      return { messages };
    } catch (err) {
      logger.error("Error in context hook", "context", err);
      return { messages: event.messages };
    }
  });

  // Cleanup on session shutdown
  const shutdown = async (reason: string) => {
    logger.warn(`Shutdown triggered by: ${reason}`, "lifecycle");
    try {
      await closeServer();
    } catch (err) {
      logger.error("Error closing server", "lifecycle", err);
    }
  };
  api.on("session_shutdown", () => { shutdown("session_shutdown"); });

  // Track server state for better error messages
  let serverReady = false;
  let serverError: string | null = null;

  api.registerTool({
      name: "render_visual",
      description: [
        "Displays an interactive HTML page in the user's browser and auto-saves it to ~/.pi/agent/renders/.",
        "",
        "USE THIS TOOL whenever you produce content that benefits from visual presentation:",
        "structured data, charts, diagrams, documentation, courses, dashboards, comparisons, analyses.",
        "",
        "The content MUST be self-contained HTML+CSS:",
        "• Complete HTML5 page with integrated <style>",
        "• Inline SVG for charts and diagrams (NOT Chart.js, D3, or other external libs)",
        "• Minimal vanilla JavaScript for interactivity",
        "• No external CDNs except Google Fonts",
        "",
        "A single page can combine multiple content types:",
        "SVG charts + tables + cards + code + timeline = ONE render_visual() call.",
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short descriptive title (e.g., 'Microservices Architecture'). Used for filename.",
          },
          content: {
            type: "string",
            description: "Complete HTML page code. Must include <!DOCTYPE html>, <head> with integrated <style>, and <body>.",
          },
        },
        required: ["title", "content"],
      } as const,
    },

    async (input: Record<string, unknown>, _ctx: ExtensionContext) => {
      const { title = "Untitled", content } = input as { title?: string; content: string };

      logger.info(`render_visual called: "${title}"`, "tool");

      // Check if there was a server startup error
      if (serverError) {
        return { 
          success: false, 
          error: `pi-render server failed to start: ${serverError}. Please check if port ${PORT} is available.` 
        };
      }

      if (!content || typeof content !== "string") {
        logger.warn("render_visual: content missing or invalid", "tool");
        return { success: false, error: "content is required and must be an HTML string." };
      }
      if (content.length < 20) {
        logger.warn(`render_visual: content too short (${content.length} chars)`, "tool");
        return { success: false, error: "HTML content seems too short or invalid." };
      }
      if (!content.toLowerCase().includes("<!doctype") && !content.toLowerCase().includes("<html")) {
        logger.warn("render_visual: content doesn't look like a complete HTML page", "tool", content.slice(0, 100));
      }

      try {
        await startServer();
      } catch (err) {
        logger.fatal("Failed to start HTTP server", "tool", err);
        return { success: false, error: `Server error: ${(err as Error).message}` };
      }

      const now      = new Date();
      const isoDate  = now.toISOString();
      const timestamp = now.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      let filePath = "";
      try {
        filePath = saveHtmlFile(title, content, isoDate);
      } catch (err) {
        logger.error("Failed to save HTML file", "tool", err);
      }

      const visual: Visual = {
        id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        content,
        filePath,
        timestamp,
        savedAt: isoDate,
      };

      try {
        const res = await fetch(`${BASE_URL}/add`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(visual),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          logger.error(`POST /add returned ${res.status}`, "tool", body);
          return { success: false, error: `Internal server error (${res.status})` };
        }
      } catch (err) {
        logger.error("Failed to send visual to local server", "tool", err);
        return { success: false, error: `Cannot reach local server: ${(err as Error).message}` };
      }

      if (!browserOpened) {
        try {
          openBrowser(BASE_URL);
          browserOpened = true;
          logger.info(`Browser opened → ${BASE_URL}`, "browser");
        } catch (err) {
          logger.warn("Failed to open browser automatically", "browser");
          api.log(`⚠️  Open manually: ${BASE_URL}`);
        }
      }

      logger.info(
        `Visual #${history.length} "${title}" added${filePath ? ` → ${path.basename(filePath)}` : ""}`,
        "tool",
      );
      api.log(`🎨 pi-render → visual "${title}" displayed${filePath ? ` | 💾 ${path.basename(filePath)}` : ""}`);

      return {
        success:  true,
        url:      BASE_URL,
        debugUrl: `${BASE_URL}/debug`,
        filePath,
        visualId: visual.id,
        message:  `✅ Page "${title}" displayed at ${BASE_URL}${filePath ? ` — saved: ${filePath}` : ""}`,
      };
    }
  );

  startServer()
    .then(() => {
      serverReady = true;
      api.log(`🎨 pi-render ready → ${BASE_URL}  |  🐛 debug → ${BASE_URL}/debug`);
      logger.info(`Ready. Renders dir: ${RENDERS_DIR}`, "init");
    })
    .catch((err: Error) => {
      serverError = err.message;
      logger.fatal(`Server startup failed`, "init", err);
      api.log(`❌ pi-render: startup failed — ${err.message}`);
    });
}
