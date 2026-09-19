import type { ItemDetail } from "@/vinted/vintedItem.js";
import type { SearchParams, SearchResult } from "@/vinted/search.js";

// All the domain talks to. It never learns that HTTP sits on the other side.
export type ItemSource = {
  search(params: SearchParams): Promise<SearchResult>;
  getItem(id: string): Promise<ItemDetail>;
};
