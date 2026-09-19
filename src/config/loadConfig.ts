import type { Config } from "@/config/config.js";
import { DEFAULT_USER_AGENT } from "@/config/defaultUserAgent.js";
import { ConfigError } from "@/vinted/errors/configError.js";

type Env = Record<string, string | undefined>;

const text = (env: Env, name: string): string => env[name]?.trim() ?? "";

const positiveInt = (env: Env, name: string, fallback: number): number => {
  const raw = text(env, name);
  if (raw.length === 0) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`${name} must be a positive integer, not "${raw}".`);
  }
  return value;
};

const flag = (env: Env, name: string, fallback: boolean): boolean => {
  const raw = text(env, name).toLowerCase();
  if (raw.length === 0) {
    return fallback;
  }
  if (raw === "true" || raw === "false") {
    return raw === "true";
  }
  throw new ConfigError(`${name} must be true or false, not "${raw}".`);
};

const list = (env: Env, name: string): string[] =>
  text(env, name)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const transport = (env: Env): Config["transport"] => {
  const raw = text(env, "VIN_TRANSPORT").toLowerCase();
  if (raw.length === 0 || raw === "stdio") {
    return "stdio";
  }
  if (raw === "http") {
    return "http";
  }
  throw new ConfigError(`VIN_TRANSPORT must be stdio or http, not "${raw}".`);
};

export const loadConfig = (env: Env): Config => ({
  marketplace: (env["VIN_MARKETPLACE"] ?? "it").trim().toLowerCase(),
  cacheTtlMs: positiveInt(env, "VIN_CACHE_TTL_MS", 300_000),
  rateLimitPerMinute: positiveInt(env, "VIN_RATE_LIMIT_PER_MINUTE", 6),
  requestTimeoutMs: positiveInt(env, "VIN_REQUEST_TIMEOUT_MS", 15_000),
  userAgent: text(env, "VIN_USER_AGENT") || DEFAULT_USER_AGENT,
  cookie: text(env, "VIN_COOKIE"),
  flareSolverrUrl: text(env, "VIN_FLARESOLVERR_URL"),
  // cf_clearance lives under an hour. Refreshing at half an hour keeps the
  // session alive without asking Vinted for more than it needs to give.
  sessionTtlMs: positiveInt(env, "VIN_SESSION_TTL_MS", 1_800_000),
  sessionKeepAlive: flag(env, "VIN_SESSION_KEEPALIVE", false),
  transport: transport(env),
  httpHost: text(env, "VIN_HTTP_HOST") || "127.0.0.1",
  httpPort: positiveInt(env, "VIN_HTTP_PORT", 3000),
  httpAllowedHosts: list(env, "VIN_HTTP_ALLOWED_HOSTS"),
  mcpToken: text(env, "VIN_MCP_TOKEN"),
  metricsEnabled: flag(env, "VIN_METRICS", true),
});
