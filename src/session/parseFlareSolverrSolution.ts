import type { SessionData } from "@/session/sessionData.js";
import { isRecord } from "@/shared/isRecord.js";
import { ParseError } from "@/vinted/errors/parseError.js";

const readCookies = (raw: unknown): string => {
  if (!Array.isArray(raw)) {
    throw new ParseError("flaresolverr", "the solution carries no cookies");
  }
  const pairs: string[] = [];
  for (const cookie of raw) {
    if (!isRecord(cookie)) {
      continue;
    }
    const name = cookie["name"];
    const value = cookie["value"];
    if (typeof name === "string" && typeof value === "string") {
      pairs.push(`${name}=${value}`);
    }
  }
  if (pairs.length === 0) {
    throw new ParseError("flaresolverr", "no usable cookie");
  }
  return pairs.join("; ");
};

const readAnonId = (raw: unknown): string | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  for (const cookie of raw) {
    if (isRecord(cookie) && cookie["name"] === "anon_id") {
      const value = cookie["value"];
      return typeof value === "string" ? value : null;
    }
  }
  return null;
};

export const parseFlareSolverrSolution = (payload: unknown): SessionData => {
  if (!isRecord(payload)) {
    throw new ParseError("flaresolverr", "the response is not a JSON object");
  }
  if (payload["status"] !== "ok") {
    const message = payload["message"];
    throw new ParseError(
      "flaresolverr",
      typeof message === "string" && message.length > 0
        ? message
        : "challenge not solved",
    );
  }
  const solution = payload["solution"];
  if (!isRecord(solution)) {
    throw new ParseError("flaresolverr", "the solution block is missing");
  }
  const userAgent = solution["userAgent"];
  return {
    cookie: readCookies(solution["cookies"]),
    anonId: readAnonId(solution["cookies"]),
    userAgent: typeof userAgent === "string" ? userAgent : null,
  };
};
