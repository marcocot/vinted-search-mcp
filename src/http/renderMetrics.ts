import type { MetricName } from "@/metrics/metricName.js";
import type { Metrics } from "@/metrics/metrics.js";

// Exhaustive on purpose: a counter added to MetricName without its description
// fails the build instead of vanishing from Prometheus in silence.
const COUNTERS: Record<MetricName, string> = {
  searches_total: "Searches actually sent to Vinted",
  items_total: "Listing pages actually fetched from Vinted",
  cache_hits_total: "Answers served from cache without touching Vinted",
  rate_limited_total: "Calls stopped by the local rate limiter",
  session_refreshes_total: "Vinted sessions opened or refreshed",
  session_blocked_total: "Sessions denied by the Cloudflare challenge",
  upstream_errors_total: "Error responses received from Vinted",
  parse_errors_total: "Vinted responses with an unexpected shape",
};

export const renderMetrics = (metrics: Metrics): string => {
  const lines: string[] = [];
  for (const [name, help] of Object.entries(COUNTERS)) {
    const metric = `vinted_mcp_${name}`;
    lines.push(`# HELP ${metric} ${help}`);
    lines.push(`# TYPE ${metric} counter`);
    lines.push(`${metric} ${metrics.value(name)}`);
  }
  return `${lines.join("\n")}\n`;
};
