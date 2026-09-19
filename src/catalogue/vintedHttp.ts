import type { HttpClient } from "@/catalogue/httpClient.js";
import type { SessionData } from "@/session/sessionData.js";
import type { FetchLike } from "@/shared/fetchLike.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import type { Marketplace } from "@/marketplace/marketplace.js";
import { BlockedError } from "@/vinted/errors/blockedError.js";

type VintedHttpOptions = {
  marketplace: Marketplace;
  userAgent: string;
  timeoutMs: number;
  session: SessionProvider;
  fetchImpl?: FetchLike;
};

// Knows one thing: how to carry a request to Vinted wearing a live session. It
// never looks inside the response.
export class VintedHttp implements HttpClient {
  private readonly marketplace: Marketplace;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly session: SessionProvider;
  private readonly fetchImpl: FetchLike;

  constructor(options: VintedHttpOptions) {
    this.marketplace = options.marketplace;
    this.userAgent = options.userAgent;
    this.timeoutMs = options.timeoutMs;
    this.session = options.session;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  // Sessions die while the server runs: cookies expire (401) or Cloudflare puts
  // the challenge back (403), and cf_clearance lasts under an hour. Each case
  // earns one refresh and one retry. Pushing past that is what raises the wall.
  async get(url: string, accept: string): Promise<Response> {
    const first = await this.send(url, accept, await this.session.get());
    if (first.status !== 401 && first.status !== 403) {
      return first;
    }
    const second = await this.send(url, accept, await this.session.refresh());
    if (second.status === 403) {
      throw new BlockedError(url);
    }
    return second;
  }

  private send(
    url: string,
    accept: string,
    session: SessionData,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      // Cloudflare ties cf_clearance to the user agent that solved the
      // challenge, so the session's own agent beats the configured one.
      "User-Agent": session.userAgent ?? this.userAgent,
      Accept: accept,
      "Accept-Language": `${this.marketplace.locale},en;q=0.5`,
      Cookie: session.cookie,
      Locale: this.marketplace.locale,
      Platform: "web",
      "X-Next-App": "marketplace-web",
      Origin: `https://${this.marketplace.host}`,
      Referer: `https://${this.marketplace.host}/`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
    };
    if (session.anonId !== null) {
      headers["X-Anon-Id"] = session.anonId;
    }
    return this.fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
