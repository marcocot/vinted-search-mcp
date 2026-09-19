import type { Metrics } from "@/metrics/metrics.js";
import type { Cache } from "@/storage/cache.js";
import type { RateLimiter } from "@/storage/rateLimiter.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import { resolveItemId } from "@/vinted/resolveItemId.js";
import type { ItemDetail } from "@/vinted/vintedItem.js";

type ItemServiceOptions = {
  source: ItemSource;
  cache: Cache<ItemDetail>;
  limiter: RateLimiter;
  metrics: Metrics;
};

export class ItemService {
  private readonly source: ItemSource;
  private readonly cache: Cache<ItemDetail>;
  private readonly limiter: RateLimiter;
  private readonly metrics: Metrics;

  constructor(options: ItemServiceOptions) {
    this.source = options.source;
    this.cache = options.cache;
    this.limiter = options.limiter;
    this.metrics = options.metrics;
  }

  async getItem(input: string): Promise<ItemDetail> {
    const id = resolveItemId(input);
    const cached = this.cache.get(id);
    if (cached !== undefined) {
      this.metrics.increment("cache_hits_total");
      return cached;
    }
    this.spend();
    const item = await this.source.getItem(id);
    this.metrics.increment("items_total");
    this.cache.set(id, item);
    return item;
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
