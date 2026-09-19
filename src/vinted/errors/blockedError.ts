import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class BlockedError extends VintedMcpError {
  constructor(url: string) {
    super(
      "BLOCKED",
      `Cloudflare is challenging the request to ${url} (403). ` +
        "No browserless client can solve it: point VIN_FLARESOLVERR_URL at a " +
        "FlareSolverr instance, or pass cookies from a real browser session " +
        "in VIN_COOKIE, or wait for the challenge to expire and lower " +
        "VIN_RATE_LIMIT_PER_MINUTE.",
    );
  }
}
