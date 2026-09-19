import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it } from "vitest";
import type { Config } from "@/config/config.js";
import { loadConfig } from "@/config/loadConfig.js";
import { startHttpServer } from "@/http/startHttpServer.js";
import { createLogger } from "@/logger/createLogger.js";
import { Metrics } from "@/metrics/metrics.js";
import type { TransportHandle } from "@/transport/transportHandle.js";

const token = "0123456789abcdef0123456789abcdef";

const config = (extra: Partial<Config> = {}): Config => ({
  ...loadConfig({ VIN_TRANSPORT: "http", VIN_MCP_TOKEN: token }),
  // Port 0: the system picks it, so two tests never fight over 3000.
  httpPort: 0,
  ...extra,
});

let running: TransportHandle | null = null;

const start = async (
  extra: Partial<Config> = {},
  buildServer: () => McpServer = () =>
    new McpServer({ name: "test", version: "0.0.0" }),
) => {
  const metrics = new Metrics();
  const lines: string[] = [];
  running = await startHttpServer({
    buildServer,
    config: config(extra),
    metrics,
    logger: createLogger((line) => lines.push(line)),
  });
  return { base: `http://127.0.0.1:${String(running.port)}`, metrics, lines };
};

afterEach(async () => {
  await running?.close();
  running = null;
});

describe("startHttpServer", () => {
  it("answers the health probe without asking for anything", async () => {
    const { base } = await start();

    const response = await fetch(`${base}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("exposes the counters in Prometheus format", async () => {
    const { base, metrics } = await start();
    metrics.increment("searches_total");

    const response = await fetch(`${base}/metrics`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("vinted_mcp_searches_total 1");
  });

  // Not everyone runs Prometheus, so the route can be switched off.
  it("hides the counters when metrics are off", async () => {
    const { base } = await start({ metricsEnabled: false });

    expect((await fetch(`${base}/metrics`)).status).toBe(404);
  });

  it("refuses /mcp without a token, and says nothing about why", async () => {
    const { base } = await start();

    const response = await fetch(`${base}/mcp`, { method: "POST" });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("refuses /mcp with the wrong token", async () => {
    const { base } = await start();

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong" },
    });

    expect(response.status).toBe(401);
  });

  it("accepts the right token and speaks the MCP protocol", async () => {
    const { base } = await start();

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" },
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("serverInfo");
  });

  // Un 500 muto e' un guasto che non si puo' nemmeno raccontare: era
  // successo davvero, e senza log non c'era modo di sapere cosa fosse.
  it("writes down the error behind a 500", async () => {
    const { base, lines } = await start({}, () => {
      throw new Error("costruzione fallita");
    });

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    });

    expect(response.status).toBe(500);
    // Chi chiama resta all'oscuro, il log no.
    expect(await response.json()).toEqual({ error: "internal error" });
    expect(lines.join("")).toContain("costruzione fallita");
    expect(lines.join("")).toContain("request failed");
  });

  it("serves no other route", async () => {
    const { base } = await start();

    expect((await fetch(`${base}/`)).status).toBe(404);
  });
});
