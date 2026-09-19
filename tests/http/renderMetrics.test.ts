import { describe, expect, it } from "vitest";
import { renderMetrics } from "@/http/renderMetrics.js";
import { Metrics } from "@/metrics/metrics.js";

describe("renderMetrics", () => {
  it("exposes every counter with its type and help line", () => {
    const metrics = new Metrics();
    metrics.increment("searches_total");

    const body = renderMetrics(metrics);

    expect(body).toContain("# TYPE vinted_mcp_searches_total counter");
    expect(body).toContain("vinted_mcp_searches_total 1");
    expect(body).toMatch(/# HELP vinted_mcp_searches_total \w/);
  });

  // A counter that never increments and never prints is a series that leaves
  // the graph without anyone noticing.
  it("prints untouched counters at zero too", () => {
    const body = renderMetrics(new Metrics());

    expect(body).toContain("vinted_mcp_parse_errors_total 0");
    expect(body).toContain("vinted_mcp_session_blocked_total 0");
    expect(body.trimEnd().split("\n")).toHaveLength(24);
  });
});
