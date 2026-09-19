import { cookieHeader } from "@/session/cookieHeader.js";
import type { FetchLike } from "@/shared/fetchLike.js";
import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import type { Marketplace } from "@/marketplace/marketplace.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";

type SessionOptions = {
  marketplace: Marketplace;
  userAgent: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
};

// The catalogue answers 401 without the cookies the site hands out on a first
// visit. One GET on the home page buys an anonymous session, no login.
export class VintedSession implements SessionProvider {
  private readonly marketplace: Marketplace;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private current: SessionData | null = null;
  private pending: Promise<SessionData> | null = null;

  constructor(options: SessionOptions) {
    this.marketplace = options.marketplace;
    this.userAgent = options.userAgent;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(): Promise<SessionData> {
    return this.current ?? (await this.refresh());
  }

  // Overlapping calls share one GET: two anonymous sessions opened in parallel
  // would invalidate each other's cookies.
  async refresh(): Promise<SessionData> {
    this.pending ??= this.fetchSession().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchSession(): Promise<SessionData> {
    const url = `https://${this.marketplace.host}/`;
    const response = await this.fetchImpl(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": `${this.marketplace.locale},en;q=0.5`,
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    // A 403 here is the Cloudflare challenge, which no browserless client can
    // solve. Say so rather than dressing it up as a fault.
    if (response.status === 403) {
      throw new BlockedError(url);
    }
    if (!response.ok) {
      throw new UpstreamError(response.status, url);
    }
    const session: SessionData = {
      cookie: cookieHeader(response.headers.getSetCookie()),
      anonId: response.headers.get("x-anon-id"),
      userAgent: null,
    };
    this.current = session;
    return session;
  }
}
