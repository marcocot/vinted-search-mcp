import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Config } from "@/config/config.js";
import type { Logger } from "@/logger/logger.js";
import { authorize } from "@/http/authorize.js";
import { renderMetrics } from "@/http/renderMetrics.js";
import type { Metrics } from "@/metrics/metrics.js";
import type { TransportHandle } from "@/transport/transportHandle.js";

type HttpServerOptions = {
  buildServer: () => McpServer;
  config: Config;
  metrics: Metrics;
  logger: Logger;
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

export const startHttpServer = async (
  options: HttpServerOptions,
): Promise<TransportHandle> => {
  const { buildServer, config, metrics, logger } = options;
  // Filled after listen: with VIN_HTTP_PORT=0 the system picks the real port,
  // and a list built on the requested one would reject every request as a
  // rebinding attempt.
  let allowedHosts: string[] = [];

  const handleMcp = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    if (!authorize(req.headers.authorization, config.mcpToken)) {
      // Deliberately uninformative: a caller without a valid token learns
      // nothing about whether it was missing, malformed or simply wrong.
      res.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": "Bearer",
      });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    // A stateless transport serves exactly one request for its whole life:
    // on the second the SDK throws "Stateless transport cannot be reused", by
    // which point headers are already in flight. A fresh one per request, and
    // with it a fresh McpServer, which costs two tool registrations here.
    const transport = new StreamableHTTPServerTransport({
      // Without it, a page in any browser on the LAN could reach this server
      // from the victim's own network position.
      enableDnsRebindingProtection: true,
      allowedHosts,
    });
    // eslint-disable-next-line tf/no-explicit-as
    await buildServer().connect(transport as Transport);
    res.on("close", () => {
      transport.close().catch((error: unknown) => {
        logger.warn("transport not closed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });
    await transport.handleRequest(req, res);
  };

  const route = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const path = (req.url ?? "/").split("?")[0];
    // Open on purpose: this is how a container and Prometheus watch the
    // service, and neither exposes anything worth attacking.
    if (path === "/health") {
      json(res, 200, { status: "ok" });
      return;
    }
    if (path === "/metrics" && config.metricsEnabled) {
      res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
      res.end(renderMetrics(metrics));
      return;
    }
    if (path === "/mcp") {
      await handleMcp(req, res);
      return;
    }
    json(res, 404, { error: "not found" });
  };

  const http = createServer((req, res) => {
    route(req, res).catch((error: unknown) => {
      // Un 500 muto e' un guasto che non si puo' nemmeno raccontare: il
      // corpo resta generico per chi chiama, ma la causa va nei log.
      logger.error("request failed", {
        path: (req.url ?? "/").split("?")[0],
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (!res.headersSent) {
        json(res, 500, { error: "internal error" });
        return;
      }
      res.end();
    });
  });

  await new Promise<void>((resolve) => {
    http.listen(config.httpPort, config.httpHost, resolve);
  });

  const address = http.address();
  const port =
    typeof address === "object" && address !== null
      ? address.port
      : config.httpPort;
  allowedHosts = [
    `${config.httpHost}:${port}`,
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    ...config.httpAllowedHosts,
  ];

  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        http.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
};
