import type { SessionData } from "@/session/sessionData.js";
import type { SessionProvider } from "@/session/sessionProvider.js";

const ANON_ID = /(?:^|;\s*)anon_id=([^;]+)/;

// A session lifted by hand from a real browser. Nothing here can be refreshed:
// when it expires it expires, and the 403 that follows should say so instead of
// hiding behind a direct bootstrap that a challenge would reject anyway.
export class FixedSession implements SessionProvider {
  private readonly session: SessionData;

  constructor(cookie: string, userAgent: string | null = null) {
    this.session = {
      cookie: cookie.trim(),
      anonId: ANON_ID.exec(cookie)?.[1] ?? null,
      userAgent,
    };
  }

  get(): Promise<SessionData> {
    return Promise.resolve(this.session);
  }

  refresh(): Promise<SessionData> {
    return Promise.resolve(this.session);
  }
}
