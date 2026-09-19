import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class UnknownMarketplaceError extends VintedMcpError {
  constructor(id: string, known: string[]) {
    super(
      "UNKNOWN_MARKETPLACE",
      `Unknown marketplace "${id}". Available: ${known.join(", ")}.`,
    );
  }
}
