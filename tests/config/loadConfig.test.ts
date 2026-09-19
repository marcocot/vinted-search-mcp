import { describe, expect, it } from "vitest";
import { DEFAULT_USER_AGENT } from "@/config/defaultUserAgent.js";
import { loadConfig } from "@/config/loadConfig.js";
import { ConfigError } from "@/vinted/errors/configError.js";

describe("loadConfig", () => {
  it("starts on usable defaults with no variable set", () => {
    expect(loadConfig({})).toEqual({
      marketplace: "it",
      cacheTtlMs: 300_000,
      rateLimitPerMinute: 6,
      requestTimeoutMs: 15_000,
      userAgent: DEFAULT_USER_AGENT,
      cookie: "",
      flareSolverrUrl: "",
      sessionTtlMs: 1_800_000,
      sessionKeepAlive: false,
      transport: "stdio",
      httpHost: "127.0.0.1",
      httpPort: 3000,
      httpAllowedHosts: [],
      mcpToken: "",
      metricsEnabled: true,
    });
  });

  it("normalises the marketplace", () => {
    expect(loadConfig({ VIN_MARKETPLACE: " FR " }).marketplace).toBe("fr");
  });

  it("reads the values from the environment", () => {
    expect(
      loadConfig({
        VIN_CACHE_TTL_MS: "1000",
        VIN_RATE_LIMIT_PER_MINUTE: "5",
        VIN_REQUEST_TIMEOUT_MS: "2000",
        VIN_USER_AGENT: "Agente/1.0",
        VIN_COOKIE: " cf_clearance=x ",
        VIN_FLARESOLVERR_URL: " http://flaresolverr:8191/v1 ",
      }),
    ).toEqual({
      marketplace: "it",
      cacheTtlMs: 1000,
      rateLimitPerMinute: 5,
      requestTimeoutMs: 2000,
      userAgent: "Agente/1.0",
      cookie: "cf_clearance=x",
      flareSolverrUrl: "http://flaresolverr:8191/v1",
      sessionTtlMs: 1_800_000,
      sessionKeepAlive: false,
      transport: "stdio",
      httpHost: "127.0.0.1",
      httpPort: 3000,
      httpAllowedHosts: [],
      mcpToken: "",
      metricsEnabled: true,
    });
  });

  it("treats an empty variable as absent", () => {
    expect(loadConfig({ VIN_CACHE_TTL_MS: "  " }).cacheTtlMs).toBe(300_000);
    expect(loadConfig({ VIN_USER_AGENT: "" }).userAgent).toBe(
      DEFAULT_USER_AGENT,
    );
  });

  it.each(["0", "-1", "2.5", "many"])("rejects %s as a limit", (raw) => {
    expect(() => loadConfig({ VIN_RATE_LIMIT_PER_MINUTE: raw })).toThrow(
      ConfigError,
    );
  });
});
