import { describe, expect, it } from "vitest";
import { Cache } from "@/storage/cache.js";

describe("Cache", () => {
  it("returns a value that is still valid", () => {
    const cache = new Cache<string>(1000, () => 0);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("forgets a key never written", () => {
    expect(new Cache<string>(1000).get("k")).toBeUndefined();
  });

  it("expires the value once the TTL has passed", () => {
    let now = 0;
    const cache = new Cache<string>(1000, () => now);
    cache.set("k", "v");
    now = 1000;
    expect(cache.get("k")).toBeUndefined();
    now = 2000;
    expect(cache.get("k")).toBeUndefined();
  });
});
