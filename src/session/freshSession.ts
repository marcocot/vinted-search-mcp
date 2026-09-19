import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import type { Metrics } from "@/metrics/metrics.js";
import type { Clock } from "@/storage/clock.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";

type FreshSessionOptions = {
  inner: SessionProvider;
  ttlMs: number;
  metrics: Metrics;
  now?: Clock;
};

// cf_clearance lives under an hour. Keeping a session until a call fails means
// somebody's request pays for the failure, so it gets refreshed once it is old
// enough.
export class FreshSession implements SessionProvider {
  private readonly inner: SessionProvider;
  private readonly ttlMs: number;
  private readonly metrics: Metrics;
  private readonly now: Clock;
  private openedAt: number | null = null;

  constructor(options: FreshSessionOptions) {
    this.inner = options.inner;
    this.ttlMs = options.ttlMs;
    this.metrics = options.metrics;
    this.now = options.now ?? Date.now;
  }

  async get(): Promise<SessionData> {
    if (this.openedAt !== null && this.now() - this.openedAt <= this.ttlMs) {
      return this.inner.get();
    }
    return this.refresh();
  }

  async refresh(): Promise<SessionData> {
    try {
      const session = await this.inner.refresh();
      this.openedAt = this.now();
      this.metrics.increment("session_refreshes_total");
      return session;
    } catch (error) {
      if (error instanceof BlockedError) {
        this.metrics.increment("session_blocked_total");
      }
      // A session that never opened must not leave a valid age behind.
      this.openedAt = null;
      throw error;
    }
  }
}
