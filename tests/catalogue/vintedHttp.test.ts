import { describe, expect, it, vi } from "vitest";
import { VintedHttp } from "@/catalogue/vintedHttp.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import type { FetchLike } from "@/shared/fetchLike.js";
import { isRecord } from "@/shared/isRecord.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";

const url = "https://api.vinted.it/svc-catalogue/items";

const session = (cookie: string, userAgent: string | null): SessionData => ({
  cookie,
  anonId: "anon-1",
  userAgent,
});

const headersOf = (init: Parameters<FetchLike>[1]): Record<string, string> => {
  const sent: Record<string, string> = {};
  const raw = init?.headers;
  if (!isRecord(raw)) {
    return sent;
  }
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      sent[name] = value;
    }
  }
  return sent;
};

const httpWith = (statuses: number[], provider?: SessionProvider) => {
  const fetchImpl = vi.fn<FetchLike>(
    async () => new Response("", { status: statuses.shift() ?? 200 }),
  );
  const sessions: SessionProvider = provider ?? {
    get: vi.fn<SessionProvider["get"]>(async () => session("a=1", null)),
    refresh: vi.fn<SessionProvider["refresh"]>(async () =>
      session("a=2", null),
    ),
  };
  const http = new VintedHttp({
    marketplace: getMarketplace("it"),
    userAgent: "Agente/1.0",
    timeoutMs: 1000,
    session: sessions,
    fetchImpl,
  });
  return { http, fetchImpl, sessions };
};

describe("VintedHttp", () => {
  it("carries cookies, anon id and the marketplace headers", async () => {
    const { http, fetchImpl } = httpWith([200]);

    await http.get(url, "application/json");

    expect(headersOf(fetchImpl.mock.calls[0]?.[1])).toMatchObject({
      Cookie: "a=1",
      "X-Anon-Id": "anon-1",
      Locale: "it-IT",
      "X-Next-App": "marketplace-web",
      Referer: "https://www.vinted.it/",
      "User-Agent": "Agente/1.0",
    });
  });

  // Cloudflare ties cf_clearance to the agent that solved the challenge.
  it("prefers the session user agent over the configured one", async () => {
    const { http, fetchImpl } = httpWith([200], {
      get: vi.fn<SessionProvider["get"]>(async () =>
        session("a=1", "Chrome/152"),
      ),
      refresh: vi.fn(),
    });

    await http.get(url, "application/json");

    expect(headersOf(fetchImpl.mock.calls[0]?.[1])["User-Agent"]).toBe(
      "Chrome/152",
    );
  });

  it("lets through responses that say nothing about the session", async () => {
    const { http, fetchImpl, sessions } = httpWith([500]);

    const response = await http.get(url, "application/json");

    expect(response.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sessions.refresh).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    "refreshes the session and retries after a %i",
    async (status) => {
      const { http, fetchImpl, sessions } = httpWith([status, 200]);

      const response = await http.get(url, "application/json");

      expect(response.status).toBe(200);
      expect(sessions.refresh).toHaveBeenCalledTimes(1);
      expect(headersOf(fetchImpl.mock.calls[1]?.[1])["Cookie"]).toBe("a=2");
    },
  );

  it("gives up when the challenge survives the refresh", async () => {
    const { http } = httpWith([403, 403]);

    await expect(http.get(url, "application/json")).rejects.toThrow(
      BlockedError,
    );
  });

  it("does not push past the second attempt on a 401", async () => {
    const { http, fetchImpl } = httpWith([401, 401]);

    const response = await http.get(url, "application/json");

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
