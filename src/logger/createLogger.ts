import type { LogLevel, Logger, Sink } from "@/logger/logger.js";
import { redact } from "@/logger/redact.js";

// stdout belongs to the MCP protocol: any diagnostic written there breaks the
// conversation with the client.
export const createLogger = (
  sink: Sink = (line) => process.stderr.write(`${line}\n`),
  now: () => string = () => new Date().toISOString(),
): Logger => {
  const log = (
    level: LogLevel,
    message: string,
    fields?: Record<string, unknown>,
  ): void => {
    sink(
      JSON.stringify({ ts: now(), level, message, ...redact(fields ?? {}) }),
    );
  };
  return {
    debug: (message, fields) => log("debug", message, fields),
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
  };
};
