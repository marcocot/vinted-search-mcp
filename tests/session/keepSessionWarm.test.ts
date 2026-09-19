import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepSessionWarm } from "@/session/keepSessionWarm.js";
import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import { createLogger } from "@/logger/createLogger.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";

const session: SessionData = { cookie: "a=1", anonId: null, userAgent: null };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("keepSessionWarm", () => {
  it("keeps the session alive at intervals", async () => {
    const get = vi.fn<SessionProvider["get"]>(async () => session);
    const provider: SessionProvider = { get, refresh: vi.fn() };

    const stop = keepSessionWarm(
      provider,
      1000,
      createLogger(() => undefined),
    );
    await vi.advanceTimersByTimeAsync(2500);
    stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(get).toHaveBeenCalledTimes(2);
  });

  // A failed idle round must not bring the process down.
  it("logs the failure without propagating it", async () => {
    const lines: string[] = [];
    const provider: SessionProvider = {
      get: vi.fn<SessionProvider["get"]>(() =>
        Promise.reject(new BlockedError("https://www.vinted.it/")),
      ),
      refresh: vi.fn(),
    };

    keepSessionWarm(
      provider,
      1000,
      createLogger((line) => lines.push(line)),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("session not refreshed");
  });
});
