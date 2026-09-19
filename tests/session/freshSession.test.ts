import { describe, expect, it, vi } from "vitest";
import { FreshSession } from "@/session/freshSession.js";
import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import { Metrics } from "@/metrics/metrics.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";

const session: SessionData = {
  cookie: "cf_clearance=x",
  anonId: "anon-1",
  userAgent: null,
};

const innerWith = (refresh: SessionProvider["refresh"]): SessionProvider => ({
  get: vi.fn<SessionProvider["get"]>(async () => session),
  refresh,
});

describe("FreshSession", () => {
  it("opens the session on the first request", async () => {
    const refresh = vi.fn<SessionProvider["refresh"]>(async () => session);
    const metrics = new Metrics();

    const opened = await new FreshSession({
      inner: innerWith(refresh),
      ttlMs: 1000,
      metrics,
      now: () => 0,
    }).get();

    expect(opened).toEqual(session);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(metrics.value("session_refreshes_total")).toBe(1);
  });

  it("reuses the session while it is young", async () => {
    const refresh = vi.fn<SessionProvider["refresh"]>(async () => session);
    let now = 0;
    const fresh = new FreshSession({
      inner: innerWith(refresh),
      ttlMs: 1000,
      metrics: new Metrics(),
      now: () => now,
    });

    await fresh.get();
    now = 1000;
    await fresh.get();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // cf_clearance expires, and an old session gets refreshed before somebody's
  // request is the one to find out.
  it("refreshes once the session is past its age", async () => {
    const refresh = vi.fn<SessionProvider["refresh"]>(async () => session);
    let now = 0;
    const fresh = new FreshSession({
      inner: innerWith(refresh),
      ttlMs: 1000,
      metrics: new Metrics(),
      now: () => now,
    });

    await fresh.get();
    now = 1001;
    await fresh.get();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("counts the sessions the challenge denied", async () => {
    const metrics = new Metrics();
    const fresh = new FreshSession({
      inner: innerWith(
        vi.fn<SessionProvider["refresh"]>(() =>
          Promise.reject(new BlockedError("https://www.vinted.it/")),
        ),
      ),
      ttlMs: 1000,
      metrics,
      now: () => 0,
    });

    await expect(fresh.get()).rejects.toThrow(BlockedError);
    expect(metrics.value("session_blocked_total")).toBe(1);
    expect(metrics.value("session_refreshes_total")).toBe(0);
  });

  it("does not trust the age of a session that never opened", async () => {
    const refresh = vi
      .fn<SessionProvider["refresh"]>()
      .mockRejectedValueOnce(new UpstreamError(503, "https://www.vinted.it/"))
      .mockResolvedValue(session);
    const fresh = new FreshSession({
      inner: innerWith(refresh),
      ttlMs: 1000,
      metrics: new Metrics(),
      now: () => 0,
    });

    await expect(fresh.get()).rejects.toThrow(UpstreamError);
    await expect(fresh.get()).resolves.toEqual(session);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
