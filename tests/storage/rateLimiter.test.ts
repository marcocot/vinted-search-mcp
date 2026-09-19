import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/storage/rateLimiter.js";
import { RateLimitedError } from "@/vinted/errors/rateLimitedError.js";

describe("RateLimiter", () => {
  it("spends the tokens it has and then refuses", () => {
    const limiter = new RateLimiter(2, () => 0);
    limiter.take();
    limiter.take();
    expect(() => limiter.take()).toThrow(RateLimitedError);
  });

  it("refills in proportion to the time that passed", () => {
    let now = 0;
    const limiter = new RateLimiter(60, () => now);
    for (let i = 0; i < 60; i += 1) {
      limiter.take();
    }
    expect(() => limiter.take()).toThrow(RateLimitedError);
    now = 1000;
    expect(() => limiter.take()).not.toThrow();
  });

  it("never fills past the size of the bucket", () => {
    let now = 0;
    const limiter = new RateLimiter(2, () => now);
    now = 600_000;
    limiter.take();
    limiter.take();
    expect(() => limiter.take()).toThrow(RateLimitedError);
  });
});
