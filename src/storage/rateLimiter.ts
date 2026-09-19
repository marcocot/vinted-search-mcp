import type { Clock } from "@/storage/clock.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";

// In-memory token bucket. The state resets on every restart, which is the
// point: it protects Vinted from us, not us from Vinted.
export class RateLimiter {
  private readonly perMinute: number;
  private readonly now: Clock;
  private tokens: number;
  private lastRefill: number;

  constructor(perMinute: number, now: Clock = Date.now) {
    this.perMinute = perMinute;
    this.now = now;
    this.tokens = perMinute;
    this.lastRefill = now();
  }

  take(): void {
    this.refill();
    if (this.tokens < 1) {
      throw new RateLimitedError(this.perMinute);
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const current = this.now();
    const elapsed = current - this.lastRefill;
    if (elapsed <= 0) {
      return;
    }
    this.tokens = Math.min(
      this.perMinute,
      this.tokens + (elapsed / 60_000) * this.perMinute,
    );
    this.lastRefill = current;
  }
}
