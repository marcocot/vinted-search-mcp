import type { FetchLike } from "@/shared/fetchLike.js";
import { parseFlareSolverrSolution } from "@/session/parseFlareSolverrSolution.js";
import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import type { Marketplace } from "@/marketplace/marketplace.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";

type FlareSolverrOptions = {
  endpoint: string;
  marketplace: Marketplace;
  timeoutMs: number;
  fetchImpl?: FetchLike;
};

// Vinted sits behind a Cloudflare challenge that no browserless client passes.
// FlareSolverr solves it with a real Chrome and hands back the cookies, and
// from there catalogue calls go back to being ordinary requests.
export class FlareSolverrSession implements SessionProvider {
  private readonly endpoint: string;
  private readonly marketplace: Marketplace;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private current: SessionData | null = null;
  private pending: Promise<SessionData> | null = null;

  constructor(options: FlareSolverrOptions) {
    this.endpoint = options.endpoint;
    this.marketplace = options.marketplace;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(): Promise<SessionData> {
    return this.current ?? (await this.refresh());
  }

  async refresh(): Promise<SessionData> {
    this.pending ??= this.solve().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async solve(): Promise<SessionData> {
    // Solving a challenge means starting a browser. The timeout for ordinary
    // calls is too short here, so FlareSolverr gets its own.
    const maxTimeout = Math.max(this.timeoutMs, 60_000);
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: `https://${this.marketplace.host}/`,
        maxTimeout,
      }),
      signal: AbortSignal.timeout(maxTimeout + 10_000),
    });
    if (!response.ok) {
      throw new UpstreamError(response.status, this.endpoint);
    }
    const session = parseFlareSolverrSolution(await response.json());
    this.current = session;
    return session;
  }
}
