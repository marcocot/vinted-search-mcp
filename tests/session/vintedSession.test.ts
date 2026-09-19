import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@/shared/fetchLike.js";
import { VintedSession } from "@/session/vintedSession.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";

const marketplace = getMarketplace("it");

const landing = (cookie: string, anonId: string): Response =>
  new Response("<html></html>", {
    status: 200,
    headers: [
      ["set-cookie", cookie],
      ["x-anon-id", anonId],
    ],
  });

const sessionWith = (fetchImpl: FetchLike) =>
  new VintedSession({
    marketplace,
    userAgent: "Agente/1.0",
    timeoutMs: 1000,
    fetchImpl,
  });

describe("VintedSession", () => {
  it("takes cookies and anon id from the marketplace home page", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      landing("access_token_web=t", "anon-1"),
    );
    const session = await sessionWith(fetchImpl).get();

    expect(session).toEqual({
      cookie: "access_token_web=t",
      anonId: "anon-1",
      userAgent: null,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.vinted.it/",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": "Agente/1.0" }),
      }),
    );
  });

  it("reuses the session it already holds", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => landing("a=1", "anon-1"));
    const session = sessionWith(fetchImpl);

    await session.get();
    await session.get();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("opens a new one only when asked", async () => {
    let n = 0;
    const fetchImpl = vi.fn<FetchLike>(async () =>
      landing(`a=${(n += 1)}`, "anon-1"),
    );
    const session = sessionWith(fetchImpl);

    await session.get();
    const refreshed = await session.refresh();

    expect(refreshed.cookie).toBe("a=2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  // Two anonymous sessions opened together would invalidate each other.
  it("shares one request between overlapping calls", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => landing("a=1", "anon-1"));
    const session = sessionWith(fetchImpl);

    await Promise.all([session.get(), session.get(), session.refresh()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("propagates an error from the home page", async () => {
    const fetchImpl = vi.fn<FetchLike>(
      async () => new Response("", { status: 503 }),
    );
    await expect(sessionWith(fetchImpl).get()).rejects.toThrow(UpstreamError);
  });
});
