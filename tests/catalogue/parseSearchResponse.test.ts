import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSearchResponse } from "@/catalogue/parseSearchResponse.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { ParseError } from "@/vinted/errors/parseError.js";

const marketplace = getMarketplace("it");

const fixture: unknown = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../fixtures/search-it.json", import.meta.url)),
    "utf8",
  ),
);

const minimal = {
  items: [{ id: 1, title: "t" }],
  pagination: {
    current_page: 1,
    per_page: 1,
    total_entries: 1,
    total_pages: 1,
  },
};

describe("parseSearchResponse", () => {
  it("reads a real catalogue response", () => {
    const result = parseSearchResponse(fixture, marketplace);

    expect(result.perPage).toBe(5);
    expect(result.items).toHaveLength(5);
    const first = result.items[0];
    expect(first?.id).toMatch(/^\d+$/);
    expect(first?.url).toMatch(/^https:\/\/www\.vinted\.it\/items\//);
    expect(first?.price?.currency).toBe("EUR");
    expect(first?.totalPrice?.amount).toBeGreaterThan(
      first?.price?.amount ?? 0,
    );
    expect(first?.seller?.id).toMatch(/^\d+$/);
    expect(first?.photo).toMatch(/^https:\/\//);
  });

  it("accepts a search with no results", () => {
    expect(
      parseSearchResponse({ ...minimal, items: [] }, marketplace).items,
    ).toEqual([]);
  });

  it("absolutises a relative url and leaves an absolute one alone", () => {
    const items = [
      { id: 1, title: "a", url: "/items/1-a" },
      { id: 2, title: "b", url: "https://cdn.example/items/2" },
      { id: 3, title: "c" },
    ];
    const result = parseSearchResponse({ ...minimal, items }, marketplace);

    expect(result.items[0]?.url).toBe("https://www.vinted.it/items/1-a");
    expect(result.items[1]?.url).toBe("https://cdn.example/items/2");
    expect(result.items[2]?.url).toBe("");
  });

  it("reports null for missing fields on an otherwise valid card", () => {
    const result = parseSearchResponse(
      { ...minimal, items: [{ id: 7, title: "solo il minimo" }] },
      marketplace,
    );

    expect(result.items[0]).toMatchObject({
      id: "7",
      price: null,
      brand: null,
      favouriteCount: null,
      seller: null,
      photo: null,
      promoted: false,
    });
  });

  it("ignores a seller without id and a photo without url", () => {
    const result = parseSearchResponse(
      {
        ...minimal,
        items: [{ id: 7, title: "t", user: { login: "x" }, photo: {} }],
      },
      marketplace,
    );

    expect(result.items[0]?.seller).toBeNull();
    expect(result.items[0]?.photo).toBeNull();
  });

  const invalid: [unknown, string][] = [
    [null, "the response is not an object"],
    [{ pagination: minimal.pagination }, "items missing"],
    [{ items: [] }, "pagination missing"],
    [{ items: [], pagination: {} }, "pagination without counters"],
    [{ ...minimal, items: ["string"] }, "card not an object"],
    [{ ...minimal, items: [{ title: "missing id" }] }, "card without id"],
    [{ ...minimal, items: [{ id: 1 }] }, "card without title"],
  ];

  it.each(invalid)("raises ParseError when %#: %s", (payload) => {
    expect(() => parseSearchResponse(payload, marketplace)).toThrow(ParseError);
  });
});
