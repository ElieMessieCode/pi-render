/**
 * Visual representation stored and displayed by pi-render
 */
export interface Visual {
  id: string;
  title: string;
  content: string;
  filePath: string;
  timestamp: string;
  savedAt: string;
}

/**
 * Input schema for render_visual tool
 */
export interface RenderVisualInput {
  title: string;
  content: string;
}

/**
 * Message type for LLM context
 */
export interface Message {
  role: string;
  content: unknown;
  timestamp?: number;
}

/**
 * Context event from pi-coding-agent
 */
export interface ContextEvent {
  messages: Message[];
}

/**
 * Extension context provided by pi-coding-agent
 */
export interface ExtensionContext {
  ui: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
  sessionManager?: unknown;
}

/**
 * Tool definition for registering with pi-coding-agent
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Extension API interface for pi-coding-agent
 */
export interface ExtensionAPI {
  /** Subscribe to lifecycle events */
  on(event: "context", handler: (event: ContextEvent, ctx: ExtensionContext) => { messages: Message[] } | void | Promise<{ messages: Message[] } | void>): void;
  on(event: "session_shutdown", handler: (ctx: ExtensionContext) => void | Promise<void>): void;
  on(event: string, handler: (...args: unknown[]) => unknown): void;
  
  /** Register a tool that the LLM can call */
  registerTool(definition: ToolDefinition, handler: (input: Record<string, unknown>, ctx: ExtensionContext) => Promise<unknown>): void;
  
  /** Log a message to the user */
  log(message: string): void;
}
