# 🎨 pi-render

> Extension pour **pi-coding-agent** — affiche des pages HTML interactives dans le navigateur et les sauvegarde automatiquement.

[![npm version](https://img.shields.io/npm/v/pi-render)](https://www.npmjs.com/package/pi-render)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/pi-render)](https://nodejs.org/)

## 📦 Installation

```bash
# Via pi-coding-agent
pi start -- -e "npm:pi-render"

# Ou ajoutez directement dans votre configuration
```

## 🚀 Principe

1. **L'agent génère du HTML+CSS+SVG** auto-contenu (pas de librairies externes)
2. **pi-render affiche la page** dans le navigateur via un serveur local (`localhost:3847`)
3. **La page est sauvegardée** dans `~/.pi/agent/renders/TIMESTAMP_titre.html`
4. **Bouton télécharger** dans l'interface pour sauvegarder dans les Downloads

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 📜 **Historique scrollable** | Chaque visuel dans un bloc collapsible |
| 🔴 **Live-reload SSE** | Pas besoin de rafraîchir manuellement |
| ⬇ **Télécharger** | Sauvegarde dans les Downloads du navigateur |
| ⎘ **Copier HTML** | Source dans le presse-papiers |
| ↗ **Nouvel onglet** | Affichage plein écran |
| 💾 **Sauvegarde auto** | Dans `~/.pi/agent/renders/` |
| 🐛 **Page debug** | Logs temps réel sur `/debug` |

## 📖 Ce qui est injecté dans chaque contexte LLM

Un system prompt détaillé explique à l'agent :

- **Quand appeler `render_visual()`** — toujours pour contenu visuel
- **Les règles HTML+CSS+SVG uniquement** — pas de libs externes
- **Les patterns recommandés** — graphiques SVG, diagrammes, tabs CSS, cards...
- **La palette de couleurs dark** — palette prédéfinie cohérente
- **Des exemples de code** — copy-paste prêts à l'emploi

## 📏 Règles du HTML généré

| ✅ Autorisé | ❌ Interdit |
|---|---|
| HTML5 + CSS3 + SVG inline | Chart.js, D3, Bootstrap, React... |
| Google Fonts (`@import`) | Autres CDN |
| JavaScript vanilla minimal | `fetch()` vers APIs externes |
| CSS animations/transitions | `localStorage`/`sessionStorage` |
| CSS variables, Grid, Flexbox | Images externes |

## 🎯 Composants disponibles

Le system prompt fournit des patterns prêts à l'emploi :

- 📊 **Graphiques en barres** (SVG)
- 📈 **Graphiques en courbes** (SVG)
- 🥧 **Camemberts** (SVG stroke-dasharray)
- 🔀 **Diagrammes de flux** (SVG)
- 🗂️ **Tabs** (CSS pur avec input radio)
- 📁 **Accordéon** (HTML natif)
- 🃏 **Cartes en grille** (CSS Grid)
- 💻 **Blocs de code** avec syntax highlighting
- 📅 **Timeline**
- 📊 **Métriques / KPI**

## 🏗️ Architecture

```
src/
├── index.ts       ← export default, system prompt, tool render_visual
├── server.ts      ← Express + SSE + shell HTML complet
├── browser.ts     ← ouverture navigateur cross-platform
├── logger.ts      ← logger central avec SSE
├── debug-page.ts  ← page de debug HTML
└── types.ts       ← interfaces TypeScript
dist/              ← code compilé
```

## 🛠️ Développement

```bash
# Installer les dépendances
npm install

# Mode développement (watch)
npm run dev

# Build production
npm run build
```

## 📋 API

### Tool: `render_visual`

Affiche une page HTML interactive dans le navigateur.

**Paramètres :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `title` | `string` | Titre court et descriptif (utilisé pour le nom du fichier) |
| `content` | `string` | Code HTML complet de la page |

**Retour :**

```json
{
  "success": true,
  "url": "http://localhost:3847",
  "debugUrl": "http://localhost:3847/debug",
  "filePath": "/home/user/.pi/agent/renders/2024-01-15_10-30-00_mon-graphique.html",
  "visualId": "1705312200000-abc123",
  "message": "✅ Page \"Mon Graphique\" affichée..."
}
```

## 🔗 Routes du serveur

| Route | Méthode | Description |
|-------|---------|-------------|
| `/` | GET | Interface principale avec historique |
| `/debug` | GET | Page de debug avec logs temps réel |
| `/sse` | GET | Server-Sent Events pour live-reload |
| `/sse/debug` | GET | SSE pour les logs de debug |
| `/add` | POST | Ajouter un nouveau visuel |
| `/api/history` | GET | Récupérer l'historique JSON |
| `/api/logs` | GET | Récupérer les logs JSON |
| `/api/logs/clear` | POST | Vider les logs |

## 📝 Exemple d'utilisation

```typescript
// L'agent génère automatiquement du contenu comme :
render_visual({
  title: "Analyse des ventes Q4",
  content: `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700&display=swap');
  :root {
    --bg:#0a0d14; --surface:#111520; --accent:#1db97e;
    --ink:#dde3f0; --muted:#7a869e;
  }
  body { background:var(--bg); color:var(--ink); font-family:'Syne',sans-serif; padding:2rem; }
  h1 { color:var(--accent); margin-bottom:1rem; }
</style>
</head>
<body>
  <h1>📊 Ventes Q4 2024</h1>
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

## 📄 Licence

[MIT](LICENSE)

## 👤 Auteur

Développé pour [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent)

---

<p align="center">
  Fait avec ❤️ pour pi-coding-agent
</p>
