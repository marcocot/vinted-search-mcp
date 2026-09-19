import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Config } from "@/config/config.js";
import { startHttpServer } from "@/http/startHttpServer.js";
import type { Metrics } from "@/metrics/metrics.js";
import { assertTransportIsUsable } from "@/transport/assertTransportIsUsable.js";
import type { TransportHandle } from "@/transport/transportHandle.js";

type TransportOptions = {
  buildServer: () => McpServer;
  config: Config;
  metrics: Metrics;
};

export const startTransport = async (
  options: TransportOptions,
): Promise<TransportHandle> => {
  assertTransportIsUsable(options.config);
  if (options.config.transport === "stdio") {
    // stdio connects once: one client owns this process's stdin and stdout for
    // its whole lifetime, unlike the HTTP path.
    await options.buildServer().connect(new StdioServerTransport());
    return { port: null, close: () => Promise.resolve() };
  }
  return startHttpServer(options);
};
