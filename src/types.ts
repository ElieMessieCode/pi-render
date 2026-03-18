// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Types internes de pi-render
// Les types ExtensionAPI, ExtensionContext viennent de @mariozechner/pi-coding-agent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Visuel stocké en mémoire et affiché dans le navigateur
 */
export interface Visual {
  id:        string;
  title:     string;
  content:   string;   // HTML complet
  filePath:  string;   // chemin ~/.pi/agent/renders/...
  timestamp: string;   // HH:MM:SS pour l'affichage
  savedAt:   string;   // ISO pour les métadonnées
}
