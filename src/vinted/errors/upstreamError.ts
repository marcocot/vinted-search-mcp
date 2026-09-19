import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class UpstreamError extends VintedMcpError {
  constructor(status: number, url: string) {
    super("UPSTREAM_ERROR", `Vinted answered ${status} to ${url}.`);
  }
}
