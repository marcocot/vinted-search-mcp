import { isRecord } from "@/shared/isRecord.js";

const REDACTED = "[redacted]";
const SECRET_FIELDS = new Set([
  "cookie",
  "setcookie",
  "authorization",
  "token",
  "anonid",
  "xanonid",
]);

const isSecret = (key: string): boolean =>
  SECRET_FIELDS.has(key.toLowerCase().replace(/[-_]/g, ""));

// A log that reveals a session is worse than no log.
export const redact = (
  fields: Record<string, unknown>,
): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (isSecret(key)) {
      safe[key] = REDACTED;
      continue;
    }
    safe[key] = isRecord(value) ? redact(value) : value;
  }
  return safe;
};
