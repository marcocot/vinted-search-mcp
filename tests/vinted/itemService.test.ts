import { describe, expect, it, vi } from "vitest";
import { Metrics } from "@/metrics/metrics.js";
import { Cache } from "@/storage/cache.js";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { InvalidItemIdError } from "@/vinted/errors/invalidItemIdError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import { ItemService } from "@/vinted/itemService.js";
import type { ItemDetail } from "@/vinted/vintedItem.js";

const detail: ItemDetail = {
  id: "10052431430",
  title: "Nike air max",
  url: "https://www.vinted.it/items/10052431430-nike-air-max",
  description: null,
  brand: "Nike Air",
  price: { amount: 35, currency: "EUR" },
  condition: "UsedCondition",
  category: null,
  colour: null,
  image: null,
  available: true,
};

const sourceWith = (getItem: ItemSource["getItem"]): ItemSource => ({
  search: vi.fn(),
  getItem,
});

const serviceWith = (getItem: ItemSource["getItem"], perMinute = 10) =>
  new ItemService({
    source: sourceWith(getItem),
    cache: new Cache<ItemDetail>(1000, () => 0),
    limiter: new RateLimiter(perMinute, () => 0),
    metrics: new Metrics(),
  });

describe("ItemService", () => {
  it("treats an id and a URL as one thing, asked once", async () => {
    const getItem = vi.fn(async () => detail);
    const service = serviceWith(getItem);

    await service.getItem("10052431430");
    await service.getItem(
      "https://www.vinted.it/items/10052431430-nike-air-max",
    );

    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith("10052431430");
  });

  // Malformed input must not spend the budget towards Vinted.
  it("rejects invalid input without touching the rate limiter", async () => {
    const getItem = vi.fn(async () => detail);
    const service = serviceWith(getItem, 1);

    await expect(service.getItem("not-an-id")).rejects.toThrow(
      InvalidItemIdError,
    );
    await expect(service.getItem("10052431430")).resolves.toEqual(detail);
  });
});
