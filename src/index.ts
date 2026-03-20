import * as fs   from "node:fs";
import * as path from "node:path";
import * as os   from "node:os";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type }              from "@sinclair/typebox";

import { Visual }                                            from "./types.js";
import { startServer, closeServer, PORT, BASE_URL, history } from "./server.js";
import { openBrowser }                                       from "./browser.js";
import { logger }                                            from "./logger.js";

const RENDERS_DIR = path.join(os.homedir(), ".pi", "agent", "renders");

function ensureRendersDir(): void {
  try { fs.mkdirSync(RENDERS_DIR, { recursive: true }); }
  catch (err) { logger.debug("Impossible de creer " + RENDERS_DIR, "fs", (err as Error).message); throw err; }
}

function saveHtmlFile(title: string, html: string, isoDate: string): string {
  ensureRendersDir();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "render";
  const ts   = isoDate.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const fp   = path.join(RENDERS_DIR, ts + "_" + slug + ".html");
  fs.writeFileSync(fp, html, "utf-8");
  logger.debug("Sauvegarde : " + fp, "fs");
  return fp;
}

// Chargement du system prompt depuis prompt.txt
function loadPrompt(): string {
  const candidates = [
    path.join(__dirname, "prompt.txt"),
    path.join(__dirname, "..", "src", "prompt.txt"),
  ];
  for (const p of candidates) {
    try { return fs.readFileSync(p, "utf-8").trim(); } catch { /* next */ }
  }
  logger.debug("prompt.txt introuvable — fallback court utilise", "init");
  return "PI-RENDER ACTIF : utilise render_visual(title, content) pour afficher des pages HTML interactives dans la charte pi (fond #1a1a18, primary #b75939).";
}

const RENDER_INSTRUCTIONS: string = loadPrompt();

let browserOpened = false;

// ── Export default ────────────────────────────────────────────────────────────
export default function piRender(pi: ExtensionAPI): void {
  logger.debug("Extension pi-render démarrée", "init");

  // ── before_agent_start — injection dans le vrai system prompt ─────────────
  pi.on("before_agent_start", async (event, _ctx) => {
    try {
      const currentPrompt = (event as any).systemPrompt as string ?? "";
      if (currentPrompt.includes("PI-RENDER ACTIF")) return;
      logger.debug("Injection instructions render dans system prompt", "before_agent_start");
      return {
        systemPrompt: currentPrompt
          ? `${currentPrompt}\n\n${RENDER_INSTRUCTIONS}`
          : RENDER_INSTRUCTIONS,
      };
    } catch (err) {
      logger.debug("Erreur dans before_agent_start", "before_agent_start", (err as Error).message);
    }
  });

  // ── session_shutdown — fermeture propre ───────────────────────────────────
  pi.on("session_shutdown", async (_event, _ctx) => {
    logger.debug("session_shutdown — fermeture serveur", "lifecycle");
    try { await closeServer(); }
    catch (err) { logger.debug("Erreur fermeture serveur", "lifecycle", (err as Error).message); }
  });

  // ── Tool render_visual ────────────────────────────────────────────────────
  pi.registerTool({
    name:        "render_visual",
    label:       "Render Visual",
    description: [
      "Affiche une page HTML interactive dans le navigateur (charte graphique pi) et la sauvegarde dans ~/.pi/agent/renders/.",
      "",
      "UTILISE CE TOOL dès que tu produis du contenu visuel : données, graphiques SVG, diagrammes, cours,",
      "dashboards, comparaisons, analyses, documentation.",
      "",
      "La page DOIT respecter la charte graphique pi (fond #1a1a18, primary #b75939, glass cards).",
      "Utilise les composants de la bibliothèque fournie dans le system prompt.",
      "SVG inline uniquement pour les graphiques — aucune lib externe.",
      "Une seule page peut combiner plusieurs composants (KPIs + graph + tableau + tabs).",
    ].join("\n"),

    parameters: Type.Object({
      title: Type.String({
        description: "Titre court et descriptif. Utilisé comme nom de fichier sauvegardé.",
      }),
      content: Type.String({
        description: "Page HTML5 complète avec <style> intégré respectant la charte pi. Voir le system prompt pour les composants disponibles.",
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { title, content } = params;
      logger.debug(`render_visual : "${title}"`, "tool");

      if (!content || content.length < 20) {
        logger.debug(`Contenu trop court (${content?.length ?? 0} chars)`, "tool");
        return {
          content: [{ type: "text", text: "❌ Contenu HTML vide ou trop court." }],
          details: { error: "content invalide" },
        };
      }

      try { await startServer(); }
      catch (err) {
        logger.debug("Impossible de démarrer le serveur", "tool", (err as Error).message);
        return {
          content: [{ type: "text", text: `❌ Erreur serveur : ${(err as Error).message}` }],
          details: { error: (err as Error).message },
        };
      }

      const now       = new Date();
      const isoDate   = now.toISOString();
      const timestamp = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      let filePath = "";
      try { filePath = saveHtmlFile(title, content, isoDate); }
      catch (err) { logger.debug("Sauvegarde impossible", "tool", (err as Error).message); }

      const visual: Visual = {
        id:       `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title, content, filePath, timestamp, savedAt: isoDate,
      };

      try {
        const res = await fetch(`${BASE_URL}/add`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(visual),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          logger.debug(`POST /add → ${res.status}`, "tool", body);
          return {
            content: [{ type: "text", text: `❌ Erreur serveur (${res.status})` }],
            details: { error: `HTTP ${res.status}` },
          };
        }
      } catch (err) {
        logger.debug("Impossible de contacter le serveur local", "tool", (err as Error).message);
        return {
          content: [{ type: "text", text: `❌ Serveur local inaccessible : ${(err as Error).message}` }],
          details: { error: (err as Error).message },
        };
      }

      if (!browserOpened) {
        try { openBrowser(BASE_URL); browserOpened = true; logger.info(`Navigateur → ${BASE_URL}`, "browser"); }
        catch { logger.debug("Impossible d'ouvrir le navigateur", "browser"); }
      }

      const fileInfo = filePath ? ` | 💾 ${path.basename(filePath)}` : "";
      logger.debug(`Visuel #${history.length} "${title}" ajouté${fileInfo}`, "tool");

      return {
        content: [{
          type: "text",
          text: `✅ Page "${title}" affichée → ${BASE_URL}\n💾 ${filePath || "non sauvegardé"}\n🐛 Debug → ${BASE_URL}/debug`,
        }],
        details: { url: BASE_URL, debugUrl: `${BASE_URL}/debug`, filePath, visualId: visual.id, total: history.length },
      };
    },
  });

  // ── Démarrage serveur ─────────────────────────────────────────────────────
  startServer()
    .then(() => logger.info(`Prêt → ${BASE_URL} | debug → ${BASE_URL}/debug | renders → ${RENDERS_DIR}`, "init"))
    .catch((err: Error) => logger.fatal(`Échec démarrage : ${err.message}`, "init", (err as Error).message));
}
