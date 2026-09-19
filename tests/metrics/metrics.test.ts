import { describe, expect, it } from "vitest";
import { Metrics } from "@/metrics/metrics.js";

describe("Metrics", () => {
  it("starts at zero and counts increments", () => {
    const metrics = new Metrics();

    expect(metrics.value("searches_total")).toBe(0);
    metrics.increment("searches_total");
    metrics.increment("searches_total");

    expect(metrics.value("searches_total")).toBe(2);
  });

  it("keeps counters apart", () => {
    const metrics = new Metrics();

    metrics.increment("cache_hits_total");

    expect(metrics.value("cache_hits_total")).toBe(1);
    expect(metrics.value("items_total")).toBe(0);
  });
});
