import type { VintedItem } from "@/vinted/vintedItem.js";

export type SearchOrder =
  "relevance" | "newest_first" | "price_low_to_high" | "price_high_to_low";

export type SearchParams = {
  query: string;
  page: number;
  perPage: number;
  order: SearchOrder;
  priceFrom?: number;
  priceTo?: number;
};

export type SearchResult = {
  items: VintedItem[];
  page: number;
  perPage: number;
  totalEntries: number;
  totalPages: number;
};
