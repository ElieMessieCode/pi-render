// ─────────────────────────────────────────────────────────────────────────────
// logger.ts — Logger central de pi-render
// Capture tout : logs applicatifs, erreurs Express, exceptions non gérées,
// rejets de promesses. Diffuse en temps réel via SSE vers /debug.
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogEntry {
  id:        number;
  level:     LogLevel;
  message:   string;
  context?:  string;       // module source (ex: "server", "tool", "render")
  detail?:   string;       // info supplémentaire ou valeur JSON
  stack?:    string;       // stack trace pour les erreurs
  ts:        string;       // HH:MM:SS.mmm
  tsISO:     string;       // ISO complet pour le tri
  elapsed:   number;       // ms depuis le démarrage de l'extension
}

// ── State ─────────────────────────────────────────────────────────────────────
const MAX_ENTRIES = 2000;
const logs: LogEntry[] = [];
let   seq          = 0;
const startedAt    = Date.now();
let   debugClients: import("http").ServerResponse[] = [];

// ── SSE clients ───────────────────────────────────────────────────────────────
export function addDebugClient(res: import("http").ServerResponse): void {
  debugClients.push(res);
  // Envoie l'historique complet au nouveau client
  const payload = JSON.stringify({ type: "history", logs });
  res.write(`data: ${payload}\n\n`);
}

export function removeDebugClient(res: import("http").ServerResponse): void {
  debugClients = debugClients.filter(c => c !== res);
}

function broadcastLog(entry: LogEntry): void {
  if (!debugClients.length) return;
  const payload = `data: ${JSON.stringify({ type: "log", entry })}\n\n`;
  debugClients.forEach(c => { try { c.write(payload); } catch { removeDebugClient(c); } });
}

// ── Core ──────────────────────────────────────────────────────────────────────
function ts(): { ts: string; tsISO: string } {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, "0");
  const m   = String(now.getMinutes()).padStart(2, "0");
  const s   = String(now.getSeconds()).padStart(2, "0");
  const ms  = String(now.getMilliseconds()).padStart(3, "0");
  return { ts: `${h}:${m}:${s}.${ms}`, tsISO: now.toISOString() };
}

function push(
  level:   LogLevel,
  message: string,
  context?: string,
  detail?:  string,
  stack?:   string,
): LogEntry {
  const { ts: t, tsISO } = ts();
  const entry: LogEntry = {
    id:      ++seq,
    level,
    message: String(message),
    context,
    detail,
    stack,
    ts:      t,
    tsISO,
    elapsed: Date.now() - startedAt,
  };

  logs.push(entry);
  if (logs.length > MAX_ENTRIES) logs.shift();

  broadcastLog(entry);
  return entry;
}

// ── API publique ──────────────────────────────────────────────────────────────
export const logger = {
  debug(message: string, context?: string, detail?: string): void {
    push("DEBUG", message, context, detail);
  },
  info(message: string, context?: string, detail?: string): void {
    push("INFO", message, context, detail);
    process.stdout.write(`[pi-render] [INFO]  ${context ? `[${context}] ` : ""}${message}\n`);
  },
  warn(message: string, context?: string, detail?: string): void {
    push("WARN", message, context, detail);
    process.stderr.write(`[pi-render] [WARN]  ${context ? `[${context}] ` : ""}${message}\n`);
  },
  error(message: string, context?: string, err?: unknown): void {
    const stack = err instanceof Error ? err.stack : undefined;
    const detail = err instanceof Error
      ? `${err.name}: ${err.message}`
      : err !== undefined ? String(err) : undefined;
    push("ERROR", message, context, detail, stack);
    process.stderr.write(`[pi-render] [ERROR] ${context ? `[${context}] ` : ""}${message}${detail ? ` — ${detail}` : ""}\n`);
    if (stack) process.stderr.write(`${stack}\n`);
  },
  fatal(message: string, context?: string, err?: unknown): void {
    const stack = err instanceof Error ? err.stack : undefined;
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : err !== undefined ? String(err) : undefined;
    push("FATAL", message, context, detail, stack);
    process.stderr.write(`[pi-render] [FATAL] ${context ? `[${context}] ` : ""}${message}${detail ? ` — ${detail}` : ""}\n`);
    if (stack) process.stderr.write(`${stack}\n`);
  },
  getLogs(): LogEntry[] { return [...logs]; },
  clear(): void { logs.length = 0; seq = 0; },
};

// ── Interception globale ──────────────────────────────────────────────────────
// Capture les erreurs non attrapées dans toute l'extension

process.on("uncaughtException", (err: Error) => {
  logger.fatal(
    `Exception non capturée : ${err.message}`,
    "process",
    err,
  );
  // Laisse pi-agent gérer le crash — on ne force pas process.exit ici
});

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error
    ? reason.message
    : String(reason);
  logger.fatal(
    `Promesse rejetée non gérée : ${message}`,
    "process",
    reason instanceof Error ? reason : new Error(String(reason)),
  );
});

// Interception de console.warn/error pour les capturer dans le logger aussi
const _consoleWarn  = console.warn.bind(console);
const _consoleError = console.error.bind(console);

console.warn = (...args: unknown[]) => {
  logger.warn(args.map(String).join(" "), "console");
  _consoleWarn(...args);
};

console.error = (...args: unknown[]) => {
  logger.error(args.map(String).join(" "), "console");
  _consoleError(...args);
};
