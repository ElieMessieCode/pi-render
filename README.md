# 🎨 pi-render

> Extension for **pi-coding-agent** — displays interactive HTML pages in the browser and auto-saves them.

[![npm version](https://img.shields.io/npm/v/pi-render)](https://www.npmjs.com/package/pi-render)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/pi-render)](https://nodejs.org/)

## 📦 Installation

```bash
# Via pi-coding-agent
pi start -- -e "npm:pi-render"
```

## 🚀 How it works

1. **The agent generates HTML+CSS+SVG** self-contained (no external libraries)
2. **pi-render displays the page** in the browser via a local server (`localhost:3847`)
3. **The page is saved** to `~/.pi/agent/renders/TIMESTAMP_title.html`
4. **Download button** in the interface to save to browser Downloads

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📜 **Scrollable history** | Each visual in a collapsible block |
| 🔴 **Live-reload SSE** | No manual refresh needed |
| ⬇ **Download** | Save to browser Downloads |
| ⎘ **Copy HTML** | Copy source to clipboard |
| ↗ **New tab** | Full-screen viewing |
| 💾 **Auto-save** | To `~/.pi/agent/renders/` |
| 🐛 **Debug page** | Real-time logs at `/debug` |

## 📖 System Prompt Injection

A detailed system prompt is injected to guide the LLM agent:

- **When to call `render_visual()`** — always for visual content
- **HTML+CSS+SVG only rules** — no external libraries
- **Recommended patterns** — SVG charts, diagrams, CSS tabs, cards...
- **Dark color palette** — predefined consistent theme
- **Copy-paste code examples** — ready to use

## 📏 HTML Rules

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| HTML5 + CSS3 + SVG inline | Chart.js, D3, Bootstrap, React... |
| Google Fonts (`@import`) | Other CDNs |
| Minimal vanilla JavaScript | `fetch()` to external APIs |
| CSS animations/transitions | `localStorage`/`sessionStorage` |
| CSS variables, Grid, Flexbox | External images |

## 🎯 Available Components

The system prompt provides ready-to-use patterns:

- 📊 **Bar charts** (SVG)
- 📈 **Line charts** (SVG)
- 🥧 **Pie charts** (SVG stroke-dasharray)
- 🔀 **Flow diagrams** (SVG)
- 🗂️ **Tabs** (CSS-only with radio inputs)
- 📁 **Accordion** (native HTML)
- 🃏 **Card grids** (CSS Grid)
- 💻 **Code blocks** with syntax highlighting
- 📅 **Timeline**
- 📊 **Metrics / KPIs**

## 🏗️ Architecture

```
src/
├── index.ts       ← default export, system prompt, render_visual tool
├── server.ts      ← Express + SSE + complete HTML shell
├── browser.ts     ← cross-platform browser opener
├── logger.ts      ← central logger with SSE
├── debug-page.ts  ← HTML debug page
└── types.ts       ← TypeScript interfaces
dist/              ← compiled output
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build
```

## 📋 API

### Tool: `render_visual`

Displays an interactive HTML page in the browser.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | `string` | Short descriptive title (used for filename) |
| `content` | `string` | Complete HTML page code |

**Returns:**

```json
{
  "success": true,
  "url": "http://localhost:3847",
  "debugUrl": "http://localhost:3847/debug",
  "filePath": "/home/user/.pi/agent/renders/2024-01-15_10-30-00_my-chart.html",
  "visualId": "1705312200000-abc123",
  "message": "✅ Page \"My Chart\" displayed..."
}
```

## 🔗 Server Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Main interface with history |
| `/debug` | GET | Debug page with real-time logs |
| `/sse` | GET | Server-Sent Events for live-reload |
| `/sse/debug` | GET | SSE for debug logs |
| `/add` | POST | Add a new visual |
| `/api/history` | GET | Get history as JSON |
| `/api/logs` | GET | Get logs as JSON |
| `/api/logs/clear` | POST | Clear logs |

## 📝 Usage Example

```typescript
render_visual({
  title: "Q4 Sales Analysis",
  content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
  :root {
    --bg:#0a0d14; --surface:#111520; --accent:#1db97e;
    --ink:#dde3f0; --muted:#7a869e;
  }
  body { background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif; padding:2rem; }
  h1 { color:var(--accent); margin-bottom:1rem; }
</style>
</head>
<body>
  <h1>📊 Q4 2024 Sales</h1>
  <svg viewBox="0 0 400 200">
    <rect x="50" y="100" width="40" height="80" fill="var(--accent)" rx="4"/>
    <rect x="120" y="60" width="40" height="120" fill="var(--accent)" rx="4"/>
    <rect x="190" y="40" width="40" height="140" fill="var(--accent)" rx="4"/>
    <rect x="260" y="20" width="40" height="160" fill="var(--accent)" rx="4"/>
  </svg>
</body>
</html>`
});
```

## 📄 License

[MIT](LICENSE)

## 👤 Author

Built for [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent)

---

<p align="center">
  Made with ❤️ for pi-coding-agent
</p>
