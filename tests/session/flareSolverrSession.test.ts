import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@/shared/fetchLike.js";
import { FlareSolverrSession } from "@/session/flareSolverrSession.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { isRecord } from "@/shared/isRecord.js";
import { ParseError } from "@/vinted/errors/parseError.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";

const solution = {
  status: "ok",
  solution: {
    userAgent: "Chrome/152",
    cookies: [
      { name: "cf_clearance", value: "clear" },
      { name: "anon_id", value: "anon-1" },
    ],
  },
};

const solved = () =>
  new Response(JSON.stringify(solution), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const sessionWith = (fetchImpl: FetchLike) =>
  new FlareSolverrSession({
    endpoint: "http://flaresolverr:8191/v1",
    marketplace: getMarketplace("it"),
    timeoutMs: 15_000,
    fetchImpl,
  });

describe("FlareSolverrSession", () => {
  it("asks FlareSolverr to open the marketplace home page", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => solved());

    const session = await sessionWith(fetchImpl).get();

    expect(session).toEqual({
      cookie: "cf_clearance=clear; anon_id=anon-1",
      anonId: "anon-1",
      userAgent: "Chrome/152",
    });
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    const body: unknown = JSON.parse(String(init?.body));
    expect(isRecord(body) && body["url"]).toBe("https://www.vinted.it/");
    expect(isRecord(body) && body["cmd"]).toBe("request.get");
  });

  // Solving a challenge means starting a browser, and the timeout for
  // ordinary calls does not cover it.
  it("gives FlareSolverr at least a minute", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => solved());

    await sessionWith(fetchImpl).get();

    const body: unknown = JSON.parse(
      String(fetchImpl.mock.calls[0]?.[1]?.body),
    );
    expect(isRecord(body) && body["maxTimeout"]).toBe(60_000);
  });

  it("reuses the solved session and asks again only on refresh", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => solved());
    const session = sessionWith(fetchImpl);

    await session.get();
    await session.get();
    await session.refresh();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("shares one challenge between overlapping calls", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => solved());
    const session = sessionWith(fetchImpl);

    await Promise.all([session.get(), session.get(), session.refresh()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("propagates an error from FlareSolverr itself", async () => {
    const fetchImpl = vi.fn<FetchLike>(
      async () => new Response("", { status: 500 }),
    );

    await expect(sessionWith(fetchImpl).get()).rejects.toThrow(UpstreamError);
  });

  it("raises ParseError when the challenge goes unsolved", async () => {
    const fetchImpl = vi.fn<FetchLike>(
      async () =>
        new Response(JSON.stringify({ status: "error", message: "nope" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    await expect(sessionWith(fetchImpl).get()).rejects.toThrow(ParseError);
  });
});
