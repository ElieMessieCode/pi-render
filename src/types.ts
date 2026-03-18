// ─────────────────────────────────────────────────────────────────────────────
// Types partagés — pi-render v2
// ─────────────────────────────────────────────────────────────────────────────

export interface Visual {
  id: string;
  title: string;
  content: string;   // HTML final complet
  filePath: string;  // chemin de sauvegarde .pi/agent/renders/
  timestamp: string;
  savedAt: string;   // ISO date
}

// ── ExtensionAPI (contrat pi-coding-agent) ─────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ContextEvent {
  messages: Message[];
  systemPrompt?: string;
}

export interface Message {
  role: string;
  content: unknown;
  timestamp?: number;
}

export interface ExtensionAPI {
  registerTool(
    definition: ToolDefinition,
    handler: (input: Record<string, unknown>) => Promise<unknown>
  ): void;
  on(
    event: "context",
    handler: (event: ContextEvent, ctx: unknown) => { messages: Message[] } | void
  ): void;
  on(event: string, handler: (event: unknown, ctx: unknown) => unknown): void;
  log(message: string): void;
}
