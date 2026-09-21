import { describe, expect, it } from "vitest";
import type { SearchParams } from "@/vinted/search.js";
import { describeSearch } from "@/tools/describeSearch.js";

const params = (overrides: Partial<SearchParams> = {}): SearchParams => ({
  query: "nike air max 42",
  page: 1,
  perPage: 20,
  order: "relevance",
  ...overrides,
});

describe("describeSearch", () => {
  // The line a person reads in Grafana instead of a query string.
  it("writes a plain search as the query alone", () => {
    expect(describeSearch(params())).toBe("nike air max 42");
  });

  it.each([
    [{ priceFrom: 20, priceTo: 60 }, "nike air max 42, 20-60€"],
    [{ priceFrom: 20 }, "nike air max 42, da 20€"],
    [{ priceTo: 60 }, "nike air max 42, fino a 60€"],
  ])("writes the price range %o", (price, expected) => {
    expect(describeSearch(params(price))).toBe(expected);
  });

  it.each([
    ["relevance", "nike air max 42"],
    ["newest_first", "nike air max 42, più recenti"],
    ["price_low_to_high", "nike air max 42, prezzo crescente"],
    ["price_high_to_low", "nike air max 42, prezzo decrescente"],
  ] as const)("names the %s order", (order, expected) => {
    expect(describeSearch(params({ order }))).toBe(expected);
  });

  it("says which page was asked for", () => {
    expect(describeSearch(params({ page: 4 }))).toBe(
      "nike air max 42, pagina 4",
    );
  });
});
