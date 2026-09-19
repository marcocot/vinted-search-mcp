import { describe, expect, it, vi } from "vitest";
import { CatalogueSource } from "@/catalogue/catalogueSource.js";
import type { HttpClient } from "@/catalogue/httpClient.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { Metrics } from "@/metrics/metrics.js";
import { ItemNotFoundError } from "@/vinted/errors/itemNotFoundError.js";
import { ParseError } from "@/vinted/errors/parseError.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";
import type { SearchParams } from "@/vinted/search.js";

const params: SearchParams = {
  query: "nike air",
  page: 1,
  perPage: 5,
  order: "relevance",
};

const searchBody = {
  items: [{ id: 1, title: "Nike Air", url: "/items/1-nike-air" }],
  pagination: {
    current_page: 1,
    per_page: 5,
    total_entries: 960,
    total_pages: 192,
  },
};

const itemHtml = `<script type="application/ld+json">${JSON.stringify({
  "@type": "Product",
  name: "Nike Air",
  offers: { price: 35, priceCurrency: "EUR", availability: "InStock" },
})}</script>`;

const sourceWith = (response: Response) => {
  const get = vi.fn<HttpClient["get"]>(async () => response);
  const metrics = new Metrics();
  const source = new CatalogueSource({
    http: { get },
    marketplace: getMarketplace("it"),
    metrics,
  });
  return { source, get, metrics };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("CatalogueSource", () => {
  it("asks the catalogue and returns what it read", async () => {
    const { source, get } = sourceWith(json(searchBody));

    const result = await source.search(params);

    expect(result.totalEntries).toBe(960);
    expect(result.items[0]?.url).toBe("https://www.vinted.it/items/1-nike-air");
    expect(get.mock.calls[0]?.[0]).toContain("api.vinted.it");
  });

  it("counts and propagates a Vinted error on search", async () => {
    const { source, metrics } = sourceWith(json({}, 500));

    await expect(source.search(params)).rejects.toThrow(UpstreamError);
    expect(metrics.value("upstream_errors_total")).toBe(1);
  });

  it("counts a non-JSON body as a shape error", async () => {
    const { source, metrics } = sourceWith(new Response("<html></html>"));

    await expect(source.search(params)).rejects.toThrow(ParseError);
    expect(metrics.value("parse_errors_total")).toBe(1);
  });

  it("reads the detail from the public page", async () => {
    const { source, get } = sourceWith(new Response(itemHtml));

    const detail = await source.getItem("10052431430");

    expect(detail.title).toBe("Nike Air");
    expect(get.mock.calls[0]?.[0]).toBe(
      "https://www.vinted.it/items/10052431430",
    );
  });

  it.each([404, 410])("turns %i into a missing listing", async (status) => {
    const { source, metrics } = sourceWith(new Response("", { status }));

    await expect(source.getItem("1")).rejects.toThrow(ItemNotFoundError);
    // A sold listing is not a Vinted fault.
    expect(metrics.value("upstream_errors_total")).toBe(0);
  });

  it("propagates the other errors of the detail page", async () => {
    const { source, metrics } = sourceWith(new Response("", { status: 500 }));

    await expect(source.getItem("1")).rejects.toThrow(UpstreamError);
    expect(metrics.value("upstream_errors_total")).toBe(1);
  });
});
