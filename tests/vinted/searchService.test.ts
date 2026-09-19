import { describe, expect, it, vi } from "vitest";
import { Metrics } from "@/metrics/metrics.js";
import { Cache } from "@/storage/cache.js";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import type { SearchParams, SearchResult } from "@/vinted/search.js";
import { SearchService } from "@/vinted/searchService.js";

const emptyResult: SearchResult = {
  items: [],
  page: 1,
  perPage: 24,
  totalEntries: 0,
  totalPages: 0,
};

const params: SearchParams = {
  query: "Nike Air",
  page: 1,
  perPage: 24,
  order: "relevance",
};

const sourceWith = (search: ItemSource["search"]): ItemSource => ({
  search,
  getItem: vi.fn(),
});

describe("SearchService", () => {
  it("asks Vinted once for identical searches", async () => {
    const search = vi.fn(async () => emptyResult);
    const service = new SearchService({
      source: sourceWith(search),
      cache: new Cache<SearchResult>(1000, () => 0),
      limiter: new RateLimiter(10, () => 0),
      metrics: new Metrics(),
    });

    await service.search(params);
    await service.search({ ...params, query: "  nike air  " });

    expect(search).toHaveBeenCalledTimes(1);
  });

  it("treats page, sort order and prices as different searches", async () => {
    const search = vi.fn(async () => emptyResult);
    const service = new SearchService({
      source: sourceWith(search),
      cache: new Cache<SearchResult>(1000, () => 0),
      limiter: new RateLimiter(10, () => 0),
      metrics: new Metrics(),
    });

    await service.search(params);
    await service.search({ ...params, page: 2 });
    await service.search({ ...params, order: "newest_first" });
    await service.search({ ...params, priceTo: 20 });

    expect(search).toHaveBeenCalledTimes(4);
  });

  it("spends no token when it answers from the cache", async () => {
    const service = new SearchService({
      source: sourceWith(vi.fn(async () => emptyResult)),
      cache: new Cache<SearchResult>(1000, () => 0),
      limiter: new RateLimiter(1, () => 0),
      metrics: new Metrics(),
    });

    await service.search(params);
    await expect(service.search(params)).resolves.toEqual(emptyResult);
  });

  it("stops at the rate limiter before calling Vinted", async () => {
    const search = vi.fn(async () => emptyResult);
    const service = new SearchService({
      source: sourceWith(search),
      cache: new Cache<SearchResult>(1000, () => 0),
      limiter: new RateLimiter(1, () => 0),
      metrics: new Metrics(),
    });

    await service.search(params);
    await expect(service.search({ ...params, page: 2 })).rejects.toThrow(
      RateLimitedError,
    );
    expect(search).toHaveBeenCalledTimes(1);
  });
});
