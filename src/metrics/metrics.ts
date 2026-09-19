import type { MetricName } from "@/metrics/metricName.js";

export class Metrics {
  private readonly counters = new Map<string, number>();

  // Only the increment is typed: series are born here, so a wrong name has to
  // stop the compiler here.
  increment(name: MetricName): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  value(name: string): number {
    return this.counters.get(name) ?? 0;
  }
}
