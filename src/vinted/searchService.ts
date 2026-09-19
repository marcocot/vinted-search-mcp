import type { Metrics } from "@/metrics/metrics.js";
import type { Cache } from "@/storage/cache.js";
import type { RateLimiter } from "@/storage/rateLimiter.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import type { SearchParams, SearchResult } from "@/vinted/search.js";

type SearchServiceOptions = {
  source: ItemSource;
  cache: Cache<SearchResult>;
  limiter: RateLimiter;
  metrics: Metrics;
};

const cacheKey = (params: SearchParams): string =>
  [
    params.query.trim().toLowerCase(),
    params.page,
    params.perPage,
    params.order,
    params.priceFrom ?? "",
    params.priceTo ?? "",
  ].join("|");

export class SearchService {
  private readonly source: ItemSource;
  private readonly cache: Cache<SearchResult>;
  private readonly limiter: RateLimiter;
  private readonly metrics: Metrics;

  constructor(options: SearchServiceOptions) {
    this.source = options.source;
    this.cache = options.cache;
    this.limiter = options.limiter;
    this.metrics = options.metrics;
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const key = cacheKey(params);
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      this.metrics.increment("cache_hits_total");
      return cached;
    }
    this.spend();
    const result = await this.source.search(params);
    this.metrics.increment("searches_total");
    this.cache.set(key, result);
    return result;
  }

  private spend(): void {
    try {
      this.limiter.take();
    } catch (error) {
      if (error instanceof RateLimitedError) {
        this.metrics.increment("rate_limited_total");
      }
      throw error;
    }
  }
}
