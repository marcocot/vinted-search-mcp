import type { Marketplace } from "@/marketplace/marketplace.js";
import { isRecord } from "@/shared/isRecord.js";
import { ParseError } from "@/vinted/errors/parseError.js";
import { parseItemBox } from "@/vinted/parseItemBox.js";
import { parseMoney } from "@/vinted/parseMoney.js";
import type { SearchResult } from "@/vinted/search.js";
import type { Seller, VintedItem } from "@/vinted/vintedItem.js";

const readId = (raw: unknown): string | null => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return typeof raw === "string" && raw.length > 0 ? raw : null;
};

const readCount = (raw: unknown): number | null =>
  typeof raw === "number" && Number.isFinite(raw) ? raw : null;

const readSeller = (raw: unknown): Seller | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const id = readId(raw["id"]);
  if (id === null) {
    return null;
  }
  const login = raw["login"];
  return {
    id,
    login: typeof login === "string" && login.length > 0 ? login : null,
    isBusiness: raw["business"] === true,
  };
};

const readPhoto = (raw: unknown): string | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const url = raw["url"] ?? raw["full_size_url"];
  return typeof url === "string" && url.length > 0 ? url : null;
};

const absoluteUrl = (raw: unknown, marketplace: Marketplace): string => {
  if (typeof raw !== "string" || raw.length === 0) {
    return "";
  }
  return raw.startsWith("http") ? raw : `https://${marketplace.host}${raw}`;
};

const readPagination = (raw: unknown): Omit<SearchResult, "items"> => {
  if (!isRecord(raw)) {
    throw new ParseError("search", "the pagination block is missing");
  }
  const page = raw["current_page"];
  const perPage = raw["per_page"];
  const totalEntries = raw["total_entries"];
  const totalPages = raw["total_pages"];
  if (
    typeof page !== "number" ||
    typeof perPage !== "number" ||
    typeof totalEntries !== "number" ||
    typeof totalPages !== "number"
  ) {
    throw new ParseError("search", "pagination without the expected counters");
  }
  return { page, perPage, totalEntries, totalPages };
};

// One missing field on an otherwise valid card is a legitimate answer (null).
// A missing id or title is not: the shape of the response changed under us.
const parseItem = (
  raw: unknown,
  index: number,
  marketplace: Marketplace,
): VintedItem => {
  if (!isRecord(raw)) {
    throw new ParseError(
      "search",
      `the item at position ${index} is not an object`,
    );
  }
  const id = readId(raw["id"]);
  if (id === null) {
    throw new ParseError("search", `the item at position ${index} has no id`);
  }
  const title = raw["title"];
  if (typeof title !== "string") {
    throw new ParseError("search", `item ${id} has no title`);
  }
  const box = isRecord(raw["item_box"]) ? raw["item_box"] : {};
  return {
    id,
    title,
    url: absoluteUrl(raw["url"], marketplace),
    price: parseMoney(raw["price"]),
    serviceFee: parseMoney(raw["service_fee"]),
    totalPrice: parseMoney(raw["total_item_price"]),
    ...parseItemBox(box["first_line"], box["second_line"]),
    favouriteCount: readCount(raw["favourite_count"]),
    viewCount: readCount(raw["view_count"]),
    seller: readSeller(raw["user"]),
    photo: readPhoto(raw["photo"]),
    promoted: raw["promoted"] === true,
  };
};

export const parseSearchResponse = (
  payload: unknown,
  marketplace: Marketplace,
): SearchResult => {
  if (!isRecord(payload)) {
    throw new ParseError("search", "the response is not a JSON object");
  }
  const items = payload["items"];
  if (!Array.isArray(items)) {
    throw new ParseError("search", "the items array is missing");
  }
  return {
    items: items.map((item, index) => parseItem(item, index, marketplace)),
    ...readPagination(payload["pagination"]),
  };
};
