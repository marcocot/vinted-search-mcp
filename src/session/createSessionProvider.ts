import { FixedSession } from "@/session/fixedSession.js";
import { FlareSolverrSession } from "@/session/flareSolverrSession.js";
import type { SessionProvider } from "@/session/sessionProvider.js";
import { VintedSession } from "@/session/vintedSession.js";
import type { Config } from "@/config/config.js";
import type { Marketplace } from "@/marketplace/marketplace.js";

// Three ways to hold a session, in order of preference: cookies handed over by
// a person, a challenge solved by FlareSolverr, or a direct anonymous visit,
// which works until Cloudflare puts the address under challenge.
export const createSessionProvider = (
  config: Config,
  marketplace: Marketplace,
): SessionProvider => {
  if (config.cookie.length > 0) {
    return new FixedSession(config.cookie, config.userAgent);
  }
  if (config.flareSolverrUrl.length > 0) {
    return new FlareSolverrSession({
      endpoint: config.flareSolverrUrl,
      marketplace,
      timeoutMs: config.requestTimeoutMs,
    });
  }
  return new VintedSession({
    marketplace,
    userAgent: config.userAgent,
    timeoutMs: config.requestTimeoutMs,
  });
};
