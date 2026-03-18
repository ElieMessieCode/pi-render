import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { ExtensionAPI, Visual, ContextEvent, Message } from "./types.js";
import { startServer, closeServer, PORT, BASE_URL, history } from "./server.js";
import { openBrowser } from "./browser.js";
import { logger } from "./logger.js";

// ── Dossier de sauvegarde ─────────────────────────────────────────────────────
const RENDERS_DIR = path.join(os.homedir(), ".pi", "agent", "renders");

function ensureRendersDir(): void {
  try {
    fs.mkdirSync(RENDERS_DIR, { recursive: true });
  } catch (err) {
    logger.error(`Impossible de créer ${RENDERS_DIR}`, "fs", err);
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
  logger.debug(`Fichier sauvegardé : ${filePath}`, "fs");
  return filePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — injecté avant chaque appel LLM
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  PI-RENDER ACTIF — Instructions de visualisation                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Tu as accès au tool render_visual(title, content) qui affiche une page HTML
interactive dans le navigateur de l'utilisateur ET la sauvegarde automatiquement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUAND APPELER render_visual — TOUJOURS QUAND :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• L'utilisateur demande une explication → page avec sections, cards, timeline
• Il y a des données à comparer → tableau, graphique SVG, barres, courbes
• Il y a une architecture / flux → diagramme SVG avec boîtes et flèches
• Il y a du code à montrer → bloc avec syntax highlighting en CSS
• Il y a un concept à enseigner → cours interactif avec tabs, exemples, quiz
• Il y a des résultats d'analyse → dashboard avec métriques, charts, résumé
• La réponse est longue → la structurer en page avec navigation interne
• L'utilisateur dit "montre", "affiche", "crée", "génère", "visualise"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES ABSOLUES DU CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ AUTORISÉ :
  • HTML5 + CSS3 inline (dans <style> dans le <head>)
  • SVG inline pour graphiques, diagrammes, icônes, illustrations
  • JavaScript vanilla minimal pour interactivité (tabs, toggles, filtres)
  • Google Fonts via @import url('https://fonts.googleapis.com/...')
  • Animations CSS (@keyframes, transitions, transforms)
  • CSS variables, Grid, Flexbox, clamp(), calc()
  • data: URIs pour les petites images

❌ INTERDIT :
  • Aucune librairie externe (pas Chart.js, D3, Bootstrap, React, Vue...)
  • Pas de CDN sauf Google Fonts
  • Pas de fetch() vers des APIs externes
  • Pas de localStorage/sessionStorage (non supporté dans iframe sandboxé)
  • Pas d'import/require de modules
  • Pas d'images externes (<img src="http://...">)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE OBLIGATOIRE DE CHAQUE PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Titre de la page</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700&family=Source+Code+Pro:wght@400;500&display=swap');
  :root {
    --bg:#0a0d14; --surface:#111520; --card:#161c2e; --border:#1e2a42;
    --accent:#1db97e; --accent-dim:rgba(29,185,126,0.12);
    --ink:#dde3f0; --muted:#7a869e; --hint:#3d4d6a;
    --amber:#e09b3d; --blue:#4da6ff; --red:#e05c7a; --purple:#a78bfa;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font-family:'Syne',sans-serif;line-height:1.7}
</style>
</head>
<body>
  <!-- Contenu structuré -->
  <script>/* JS vanilla uniquement si nécessaire */</script>
</body>
</html>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSANTS & PATTERNS RECOMMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GRAPHIQUES EN BARRES (SVG) ──
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <line x1="40" y1="10" x2="40" y2="160" stroke="var(--border)" stroke-width="0.5"/>
  <rect x="60" y="60" width="40" height="100" rx="4" fill="var(--accent)" opacity="0.85"/>
  <text x="80" y="175" text-anchor="middle" font-size="11" fill="var(--muted)">Jan</text>
  <text x="80" y="52" text-anchor="middle" font-size="11" fill="var(--ink)" font-weight="600">120</text>
</svg>

── GRAPHIQUE EN COURBES (SVG) ──
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

── CAMEMBERT (SVG stroke-dasharray) ──
<svg viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="45" fill="none" stroke="var(--accent)"
    stroke-width="20" stroke-dasharray="113 170" transform="rotate(-90 60 60)"/>
  <circle cx="60" cy="60" r="45" fill="none" stroke="var(--blue)"
    stroke-width="20" stroke-dasharray="57 226" stroke-dashoffset="-113" transform="rotate(-90 60 60)"/>
</svg>

── DIAGRAMME DE FLUX (SVG) ──
<svg viewBox="0 0 400 300">
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3z" fill="var(--muted)"/>
  </marker></defs>
  <rect x="10" y="120" width="100" height="40" rx="8" fill="var(--card)" stroke="var(--border)"/>
  <text x="60" y="145" text-anchor="middle" font-size="12" fill="var(--ink)">Étape 1</text>
  <line x1="110" y1="140" x2="145" y2="140" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#arr)"/>
</svg>

── TABS (CSS pur avec input radio) ──
<input type="radio" id="t1" name="tab" checked hidden>
<input type="radio" id="t2" name="tab" hidden>
<div class="tab-nav">
  <label for="t1">Onglet 1</label>
  <label for="t2">Onglet 2</label>
</div>
<div class="panels">
  <div class="panel" id="p1">Contenu 1</div>
  <div class="panel" id="p2">Contenu 2</div>
</div>
<style>
.panel{display:none}
#t1:checked~.panels #p1,#t2:checked~.panels #p2{display:block}
#t1:checked~.tab-nav label[for="t1"],#t2:checked~.tab-nav label[for="t2"]{color:var(--accent);border-bottom-color:var(--accent)}
</style>

── ACCORDÉON (HTML natif) ──
<details><summary>Titre</summary><div>Contenu</div></details>

── CARTES EN GRILLE ──
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
  <div style="background:var(--card);border:0.5px solid var(--border);border-radius:12px;padding:1.25rem">
    <div style="font-size:24px;margin-bottom:8px">🚀</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:6px">Titre</div>
    <div style="font-size:13px;color:var(--muted)">Description</div>
  </div>
</div>

── BLOC DE CODE CSS HIGHLIGHTING ──
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
    <div style="font-size:14px;font-weight:500">Événement</div>
  </div>
</div>

── MÉTRIQUE / KPI ──
<div style="text-align:center;padding:1.5rem">
  <div style="font-size:36px;font-weight:700;color:var(--accent)">98.7%</div>
  <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">Disponibilité</div>
  <div style="font-size:11px;color:var(--hint)">↑ +2.1% vs mois dernier</div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BONNE PRATIQUE : UNE PAGE = PLUSIEURS SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un seul appel render_visual() peut contenir :
  • Header avec titre + badges
  • Métriques KPI en haut
  • Graphique SVG au centre
  • Tableau de données en bas
  • Cards de recommandations
  → C'est UNE SEULE page HTML, riche et complète.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANIMATIONS RECOMMANDÉES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
/* countUp : JS vanilla — let i=0; const t=setInterval(()=>{el.textContent=Math.round(i+=target/60);if(i>=target)clearInterval(t)},16) */
`.trim();

// ── State ─────────────────────────────────────────────────────────────────────
let browserOpened = false;

// ── Export default ────────────────────────────────────────────────────────────
export default function piRender(api: ExtensionAPI): void {
  logger.info("Extension pi-render démarrée", "init");

  // ── Hook context — system prompt avant chaque appel LLM ──────────────────────
  api.on("context", (event: ContextEvent) => {
    try {
      const messages: Message[] = [...event.messages];
      const alreadyInjected = messages.some(m =>
        typeof m.content === "string" && (m.content as string).includes("PI-RENDER ACTIF")
      );
      if (!alreadyInjected) {
        messages.unshift({ role: "user", content: SYSTEM_PROMPT, timestamp: Date.now() });
        logger.debug("System prompt injecté dans le contexte LLM", "context");
      }
      return { messages };
    } catch (err) {
      logger.error("Erreur dans le hook context", "context", err);
      return { messages: event.messages };
    }
  });

  // ── Hooks de fin de session ───────────────────────────────────────────────────
  const shutdown = async (reason: string) => {
    logger.warn(`Fermeture déclenchée par : ${reason}`, "lifecycle");
    try {
      await closeServer();
    } catch (err) {
      logger.error("Erreur lors de la fermeture du serveur", "lifecycle", err);
    }
  };
  api.on("session_end",    () => { shutdown("session_end");    });
  api.on("session_switch", () => { shutdown("session_switch"); });

  // ── Tool render_visual ────────────────────────────────────────────────────────
  api.registerTool(
    {
      name: "render_visual",
      description: [
        "Affiche une page HTML interactive dans le navigateur de l'utilisateur et la sauvegarde automatiquement dans ~/.pi/agent/renders/.",
        "",
        "UTILISE CE TOOL dès que tu produis du contenu qui bénéficie d'une présentation visuelle :",
        "données structurées, graphiques, diagrammes, documentation, cours, dashboards, comparaisons, analyses.",
        "",
        "Le contenu DOIT être du HTML+CSS auto-contenu :",
        "• Page HTML5 complète avec <style> intégré",
        "• SVG inline pour les graphiques et diagrammes (PAS de Chart.js, D3, ou autre lib externe)",
        "• JavaScript vanilla minimal pour l'interactivité",
        "• Aucun CDN externe sauf Google Fonts",
        "",
        "Une seule page peut combiner plusieurs types de contenus :",
        "graphiques SVG + tableaux + cards + code + timeline = UN seul appel render_visual().",
      ].join("\n"),
      input_schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Titre court et descriptif (ex: 'Architecture microservices'). Utilisé pour le nom du fichier.",
          },
          content: {
            type: "string",
            description: "Code HTML complet de la page. Doit contenir <!DOCTYPE html>, <head> avec <style> intégré, et <body>.",
          },
        },
        required: ["title", "content"],
      },
    },

    async (input) => {
      const { title = "Sans titre", content } = input as { title: string; content: string };

      logger.info(`render_visual appelé : "${title}"`, "tool");

      // Validation
      if (!content || typeof content !== "string") {
        logger.warn("render_visual : content manquant ou invalide", "tool");
        return { success: false, error: "content est requis et doit être une chaîne HTML." };
      }
      if (content.length < 20) {
        logger.warn(`render_visual : content trop court (${content.length} chars)`, "tool");
        return { success: false, error: "Le contenu HTML semble trop court ou invalide." };
      }
      if (!content.toLowerCase().includes("<!doctype") && !content.toLowerCase().includes("<html")) {
        logger.warn("render_visual : le content ne ressemble pas à une page HTML complète", "tool", content.slice(0, 100));
      }

      // Démarrage serveur
      try {
        await startServer();
      } catch (err) {
        logger.fatal("Impossible de démarrer le serveur HTTP", "tool", err);
        return { success: false, error: `Erreur serveur : ${(err as Error).message}` };
      }

      const now      = new Date();
      const isoDate  = now.toISOString();
      const timestamp = now.toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      // Sauvegarde fichier
      let filePath = "";
      try {
        filePath = saveHtmlFile(title, content, isoDate);
      } catch (err) {
        logger.error("Impossible de sauvegarder le fichier HTML", "tool", err);
        // Non bloquant — on continue quand même
      }

      // Création du visuel
      const visual: Visual = {
        id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        content,
        filePath,
        timestamp,
        savedAt: isoDate,
      };

      // Envoi au serveur local
      try {
        const res = await fetch(`${BASE_URL}/add`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(visual),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          logger.error(`POST /add a retourné ${res.status}`, "tool", body);
          return { success: false, error: `Erreur serveur interne (${res.status})` };
        }
      } catch (err) {
        logger.error("Impossible d'envoyer le visuel au serveur local", "tool", err);
        return { success: false, error: `Impossible de contacter le serveur local : ${(err as Error).message}` };
      }

      // Ouverture du navigateur (premier visuel seulement)
      if (!browserOpened) {
        try {
          openBrowser(BASE_URL);
          browserOpened = true;
          logger.info(`Navigateur ouvert → ${BASE_URL}`, "browser");
        } catch (err) {
          logger.warn("Impossible d'ouvrir le navigateur automatiquement", "browser");
          api.log(`⚠️  Ouvre manuellement : ${BASE_URL}`);
        }
      }

      logger.info(
        `Visuel #${history.length} "${title}" ajouté${filePath ? ` → ${path.basename(filePath)}` : ""}`,
        "tool",
      );
      api.log(`🎨 pi-render → visuel "${title}" affiché${filePath ? ` | 💾 ${path.basename(filePath)}` : ""}`);

      return {
        success:  true,
        url:      BASE_URL,
        debugUrl: `${BASE_URL}/debug`,
        filePath,
        visualId: visual.id,
        message:  `✅ Page "${title}" affichée sur ${BASE_URL}${filePath ? ` — sauvegardée : ${filePath}` : ""}`,
      };
    }
  );

  // Démarrage serveur en arrière-plan
  startServer()
    .then(() => {
      api.log(`🎨 pi-render prêt → ${BASE_URL}  |  🐛 debug → ${BASE_URL}/debug`);
      logger.info(`Prêt. Renders dir : ${RENDERS_DIR}`, "init");
    })
    .catch((err: Error) => {
      logger.fatal(`Échec du démarrage du serveur`, "init", err);
      api.log(`❌ pi-render : échec démarrage — ${err.message}`);
    });
}
