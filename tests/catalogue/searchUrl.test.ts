import { describe, expect, it } from "vitest";
import { searchUrl } from "@/catalogue/searchUrl.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import type { SearchParams } from "@/vinted/search.js";

const params: SearchParams = {
  query: "nike air",
  page: 2,
  perPage: 5,
  order: "price_low_to_high",
};

describe("searchUrl", () => {
  // The catalogue lives on the api. host, not on the site.
  it("points at the api host of the marketplace", () => {
    const url = new URL(searchUrl(getMarketplace("it"), params));

    expect(url.origin).toBe("https://api.vinted.it");
    expect(url.pathname).toBe("/svc-catalogue/items");
  });

  it("translates the parameters into the names Vinted expects", () => {
    const url = new URL(searchUrl(getMarketplace("it"), params));

    expect(Object.fromEntries(url.searchParams)).toEqual({
      search_text: "nike air",
      page: "2",
      per_page: "5",
      order: "price_low_to_high",
      currency: "EUR",
    });
  });

  it("adds price filters only when they exist", () => {
    const url = new URL(
      searchUrl(getMarketplace("uk"), { ...params, priceFrom: 5, priceTo: 20 }),
    );

    expect(url.searchParams.get("price_from")).toBe("5");
    expect(url.searchParams.get("price_to")).toBe("20");
    expect(url.searchParams.get("currency")).toBe("GBP");
  });
});
