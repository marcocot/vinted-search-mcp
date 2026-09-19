import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "@/logger/createLogger.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { Metrics } from "@/metrics/metrics.js";
import { Cache } from "@/storage/cache.js";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { registerSearchItems } from "@/tools/registerSearchItems.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import type { SearchResult } from "@/vinted/search.js";
import { SearchService } from "@/vinted/searchService.js";

const result: SearchResult = {
  items: [
    {
      id: "1",
      title: "Nike Air",
      url: "https://www.vinted.it/items/1-nike-air",
      price: { amount: 35, currency: "EUR" },
      serviceFee: { amount: 2.45, currency: "EUR" },
      totalPrice: { amount: 37.45, currency: "EUR" },
      brand: "Nike",
      size: "43",
      condition: "Ottime",
      favouriteCount: 3,
      viewCount: 10,
      seller: { id: "9", login: "marco", isBusiness: false },
      photo: "https://images1.vinted.net/a.webp",
      promoted: false,
    },
  ],
  page: 1,
  perPage: 24,
  totalEntries: 960,
  totalPages: 40,
};

const connect = async (search: ItemSource["search"]) => {
  const source: ItemSource = {
    search,
    getItem: vi.fn<ItemSource["getItem"]>(),
  };
  const lines: string[] = [];
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerSearchItems({
    server,
    service: new SearchService({
      source,
      cache: new Cache<SearchResult>(1000, () => 0),
      limiter: new RateLimiter(100, () => 0),
      metrics: new Metrics(),
    }),
    marketplace: getMarketplace("it"),
    logger: createLogger((line) => lines.push(line)),
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return { client, lines };
};

const rejected: [Record<string, unknown>, string][] = [
  [{ query: "" }, "query vuota"],
  [{ query: "nike", page: 11 }, "oltre l'ultima pagina servita"],
  [{ query: "nike", perPage: 97 }, "oltre il massimo per pagina"],
  [{ query: "nike", order: "cheapest" }, "ordinamento inesistente"],
];

describe("registerSearchItems", () => {
  it("announces the marketplace it searches", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["search"]>(async () => result),
    );
    const { tools } = await client.listTools();

    expect(tools[0]?.name).toBe("search_items");
    expect(tools[0]?.description).toContain("www.vinted.it");
  });

  it("returns results as structured content", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["search"]>(async () => result),
    );

    const response = await client.callTool({
      name: "search_items",
      arguments: { query: "nike air" },
    });

    expect(response.structuredContent).toEqual(result);
    expect(response.isError).toBeFalsy();
  });

  it("applies the defaults for page, size and sort order", async () => {
    const search = vi.fn<ItemSource["search"]>(async () => result);
    const { client } = await connect(search);

    await client.callTool({
      name: "search_items",
      arguments: { query: "nike air" },
    });

    expect(search).toHaveBeenCalledWith({
      query: "nike air",
      page: 1,
      perPage: 24,
      order: "relevance",
    });
  });

  it("passes price filters only when given", async () => {
    const search = vi.fn<ItemSource["search"]>(async () => result);
    const { client } = await connect(search);

    await client.callTool({
      name: "search_items",
      arguments: { query: "nike", priceTo: 20 },
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ priceTo: 20 }),
    );
    expect(search.mock.calls[0]?.[0]).not.toHaveProperty("priceFrom");
  });

  it("says outright when there is no listing", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["search"]>(async () => ({
        ...result,
        items: [],
        totalEntries: 0,
      })),
    );

    const response = await client.callTool({
      name: "search_items",
      arguments: { query: "cosa inesistente" },
    });

    expect(response.content).toEqual([
      { type: "text", text: "No listings found." },
    ]);
  });

  it("reports the error code instead of failing quietly", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["search"]>(() =>
        Promise.reject(new RateLimitedError(30)),
      ),
    );

    const response = await client.callTool({
      name: "search_items",
      arguments: { query: "nike" },
    });

    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("RATE_LIMITED");
  });

  // Un errore che torna al chiamante e non lascia una riga nei log e' un
  // guasto che chi gestisce il server scopre solo per lamentele.
  it("writes the failure down as well as returning it", async () => {
    const { client, lines } = await connect(
      vi.fn<ItemSource["search"]>(() =>
        Promise.reject(new RateLimitedError(30)),
      ),
    );

    await client.callTool({
      name: "search_items",
      arguments: { query: "nike" },
    });

    expect(lines.join("")).toContain("tool failed");
    expect(lines.join("")).toContain("search_items");
    expect(lines.join("")).toContain("RATE_LIMITED");
  });

  it("translates an error that does not come from the domain", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["search"]>(() => Promise.reject(new Error("boom"))),
    );

    const response = await client.callTool({
      name: "search_items",
      arguments: { query: "nike" },
    });

    expect(JSON.stringify(response.content)).toContain("UNKNOWN: boom");
  });

  it.each(rejected)(
    "rejects %#: %s before the service sees it",
    async (args) => {
      const search = vi.fn<ItemSource["search"]>(async () => result);
      const { client } = await connect(search);

      const response = await client.callTool({
        name: "search_items",
        arguments: args,
      });

      expect(response.isError).toBe(true);
      expect(JSON.stringify(response.content)).toContain("validation");
      expect(search).not.toHaveBeenCalled();
    },
  );
});
