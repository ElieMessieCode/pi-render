export interface Visual {
  id: string;
  title: string;
  content: string;
  filePath: string;
  timestamp: string;
  savedAt: string;
}

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
