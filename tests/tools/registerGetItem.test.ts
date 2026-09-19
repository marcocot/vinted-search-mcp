import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "@/logger/createLogger.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { Metrics } from "@/metrics/metrics.js";
import { Cache } from "@/storage/cache.js";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { registerGetItem } from "@/tools/registerGetItem.js";
import { ItemService } from "@/vinted/itemService.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import type { ItemDetail } from "@/vinted/vintedItem.js";

const detail: ItemDetail = {
  id: "10052431430",
  title: "Nike air max",
  url: "https://www.vinted.it/items/10052431430-nike-air-max",
  description: "In buone condizioni",
  brand: "Nike Air",
  price: { amount: 35, currency: "EUR" },
  condition: "UsedCondition",
  category: "Uomo Scarpe da ginnastica",
  colour: "Bianco",
  image: "https://images1.vinted.net/a.webp",
  available: true,
};

const connect = async (getItem: ItemSource["getItem"]) => {
  const source: ItemSource = { search: vi.fn<ItemSource["search"]>(), getItem };
  const lines: string[] = [];
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerGetItem({
    server,
    service: new ItemService({
      source,
      cache: new Cache<ItemDetail>(1000, () => 0),
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

describe("registerGetItem", () => {
  it("accepts the URL a person pasted", async () => {
    const getItem = vi.fn<ItemSource["getItem"]>(async () => detail);
    const { client } = await connect(getItem);

    const response = await client.callTool({
      name: "get_item",
      arguments: { item: detail.url },
    });

    expect(getItem).toHaveBeenCalledWith("10052431430");
    expect(response.structuredContent).toEqual(detail);
    expect(response.content).toEqual([
      { type: "text", text: "Nike air max — 35 EUR" },
    ]);
  });

  it("takes the id as a number too", async () => {
    const getItem = vi.fn<ItemSource["getItem"]>(async () => detail);
    const { client } = await connect(getItem);

    const response = await client.callTool({
      name: "get_item",
      arguments: { item: 10052431430 },
    });

    expect(response.isError).toBeFalsy();
    expect(getItem).toHaveBeenCalledWith("10052431430");
  });

  it("summarises a listing with no price", async () => {
    const { client } = await connect(
      vi.fn<ItemSource["getItem"]>(async () => ({ ...detail, price: null })),
    );

    const response = await client.callTool({
      name: "get_item",
      arguments: { item: "10052431430" },
    });

    expect(response.content).toEqual([
      { type: "text", text: "Nike air max — price unavailable" },
    ]);
  });

  it("reports the code when the input is not a listing", async () => {
    const getItem = vi.fn<ItemSource["getItem"]>(async () => detail);
    const { client } = await connect(getItem);

    const response = await client.callTool({
      name: "get_item",
      arguments: { item: "pippo" },
    });

    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("INVALID_ITEM_ID");
    expect(getItem).not.toHaveBeenCalled();
  });
});
