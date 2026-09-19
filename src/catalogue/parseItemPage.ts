import type { Marketplace } from "@/marketplace/marketplace.js";
import { isRecord } from "@/shared/isRecord.js";
import { ParseError } from "@/vinted/errors/parseError.js";
import type { ItemDetail, Money } from "@/vinted/vintedItem.js";

const LD_JSON =
  /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readImage = (value: unknown): string | null =>
  Array.isArray(value) ? readString(value[0]) : readString(value);

const readPrice = (
  offer: Record<string, unknown> | null,
  marketplace: Marketplace,
): Money | null => {
  if (offer === null) {
    return null;
  }
  const raw = offer["price"];
  const amount = typeof raw === "string" ? Number(raw) : raw;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }
  return {
    amount,
    currency: readString(offer["priceCurrency"]) ?? marketplace.currency,
  };
};

// schema.org uses either "UsedCondition" or the full URL of the same term.
const readCondition = (value: unknown): string | null => {
  const raw = readString(value);
  return raw === null ? null : (raw.split("/").pop() ?? null);
};

const readAvailability = (value: unknown): boolean | null => {
  const raw = readString(value);
  return raw === null ? null : raw.toLowerCase().includes("instock");
};

const findProduct = (html: string): Record<string, unknown> | null => {
  for (const match of html.matchAll(LD_JSON)) {
    const block = match[1];
    if (block === undefined) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    if (isRecord(parsed) && parsed["@type"] === "Product") {
      return parsed;
    }
  }
  return null;
};

// The JSON detail endpoint (/api/v2/items/{id}/details) answers 403. The only
// source served to a browserless client is the JSON-LD on the public page.
export const parseItemPage = (
  html: string,
  id: string,
  marketplace: Marketplace,
): ItemDetail => {
  const product = findProduct(html);
  if (product === null) {
    throw new ParseError("item page", `no JSON-LD Product for item ${id}`);
  }
  const name = product["name"];
  if (typeof name !== "string" || name.length === 0) {
    throw new ParseError("item page", `the JSON-LD of item ${id} has no name`);
  }
  const offers = product["offers"];
  const offer = isRecord(offers) ? offers : null;
  return {
    id,
    title: name,
    url:
      readString(offer?.["url"]) ?? `https://${marketplace.host}/items/${id}`,
    description: readString(product["description"]),
    brand: readString(
      isRecord(product["brand"]) ? product["brand"]["name"] : null,
    ),
    price: readPrice(offer, marketplace),
    condition: readCondition(offer?.["itemCondition"]),
    category: readString(product["category"]),
    colour: readString(product["color"]),
    image: readImage(product["image"]),
    available: readAvailability(offer?.["availability"]),
  };
};
