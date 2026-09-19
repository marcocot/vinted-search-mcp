import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CatalogueSource } from "@/catalogue/catalogueSource.js";
import { createSessionProvider } from "@/session/createSessionProvider.js";
import { FreshSession } from "@/session/freshSession.js";
import { keepSessionWarm } from "@/session/keepSessionWarm.js";
import { VintedHttp } from "@/catalogue/vintedHttp.js";
import type { Config } from "@/config/config.js";
import { loadConfig } from "@/config/loadConfig.js";
import { createLogger } from "@/logger/createLogger.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { Metrics } from "@/metrics/metrics.js";
import { Cache } from "@/storage/cache.js";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { registerGetItem } from "@/tools/registerGetItem.js";
import { registerSearchItems } from "@/tools/registerSearchItems.js";
import { startTransport } from "@/transport/startTransport.js";
import { ItemService } from "@/vinted/itemService.js";
import type { SearchResult } from "@/vinted/search.js";
import { SearchService } from "@/vinted/searchService.js";
import type { ItemDetail } from "@/vinted/vintedItem.js";

const logger = createLogger();

const sessionKind = (config: Config): string => {
  if (config.cookie.length > 0) {
    return "fixed cookies";
  }
  return config.flareSolverrUrl.length > 0 ? "flaresolverr" : "direct";
};

const main = async (): Promise<void> => {
  const config = loadConfig(process.env);
  const marketplace = getMarketplace(config.marketplace);
  const metrics = new Metrics();
  const session = new FreshSession({
    inner: createSessionProvider(config, marketplace),
    ttlMs: config.sessionTtlMs,
    metrics,
  });
  const source = new CatalogueSource({
    http: new VintedHttp({
      marketplace,
      userAgent: config.userAgent,
      timeoutMs: config.requestTimeoutMs,
      session,
    }),
    marketplace,
    metrics,
  });
  // One bucket for both tools: the request budget belongs to the site, not
  // to the tool spending it.
  const limiter = new RateLimiter(config.rateLimitPerMinute);
  const searches = new SearchService({
    source,
    cache: new Cache<SearchResult>(config.cacheTtlMs),
    limiter,
    metrics,
  });
  const items = new ItemService({
    source,
    cache: new Cache<ItemDetail>(config.cacheTtlMs),
    limiter,
    metrics,
  });

  const buildServer = (): McpServer => {
    const server = new McpServer({
      name: "vinted-search-mcp",
      version: "0.1.1",
    });
    registerSearchItems(server, searches, marketplace);
    registerGetItem(server, items, marketplace);
    return server;
  };

  const transport = await startTransport({ buildServer, config, metrics });
  if (config.sessionKeepAlive) {
    keepSessionWarm(session, config.sessionTtlMs, logger);
  }

  logger.info("server started", {
    marketplace: marketplace.id,
    transport: config.transport,
    port: transport.port,
    rateLimitPerMinute: config.rateLimitPerMinute,
    session: sessionKind(config),
    keepAlive: config.sessionKeepAlive,
  });
};

main().catch((error: unknown) => {
  logger.error("startup failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
