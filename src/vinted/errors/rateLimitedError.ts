import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class RateLimitedError extends VintedMcpError {
  constructor(perMinute: number) {
    super(
      "RATE_LIMITED",
      `Local limit of ${perMinute} requests per minute to Vinted reached.`,
    );
  }
}
