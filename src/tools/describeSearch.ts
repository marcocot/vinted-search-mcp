import type { SearchParams } from "@/vinted/search.js";

const ORDERS: Record<SearchParams["order"], string | null> = {
  relevance: null,
  newest_first: "più recenti",
  price_low_to_high: "prezzo crescente",
  price_high_to_low: "prezzo decrescente",
};

const price = (params: SearchParams): string | null => {
  if (params.priceFrom !== undefined && params.priceTo !== undefined) {
    return `${String(params.priceFrom)}-${String(params.priceTo)}€`;
  }
  if (params.priceFrom !== undefined) {
    return `da ${String(params.priceFrom)}€`;
  }
  if (params.priceTo !== undefined) {
    return `fino a ${String(params.priceTo)}€`;
  }
  return null;
};

// The one piece of Italian in the source, and it earns its place: this string
// is read by a person in Grafana, next to the other MCP servers' searches.
export const describeSearch = (params: SearchParams): string => {
  const parts: (string | null)[] = [
    params.query,
    price(params),
    ORDERS[params.order],
    params.page === 1 ? null : `pagina ${String(params.page)}`,
  ];
  return parts
    .filter((part): part is string => part !== null && part.length > 0)
    .join(", ");
};
