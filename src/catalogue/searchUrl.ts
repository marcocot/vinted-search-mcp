import type { Marketplace } from "@/marketplace/marketplace.js";
import type { SearchParams } from "@/vinted/search.js";

export const searchUrl = (
  marketplace: Marketplace,
  params: SearchParams,
): string => {
  const url = new URL("/svc-catalogue/items", `https://${marketplace.apiHost}`);
  url.searchParams.set("search_text", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("per_page", String(params.perPage));
  url.searchParams.set("order", params.order);
  url.searchParams.set("currency", marketplace.currency);
  if (params.priceFrom !== undefined) {
    url.searchParams.set("price_from", String(params.priceFrom));
  }
  if (params.priceTo !== undefined) {
    url.searchParams.set("price_to", String(params.priceTo));
  }
  return url.toString();
};
