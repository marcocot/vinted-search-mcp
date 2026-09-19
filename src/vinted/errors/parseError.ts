import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

// Not the same as "no results": Vinted changed the shape of its response, and
// anything this server returned would be invented.
export class ParseError extends VintedMcpError {
  constructor(what: string, detail: string) {
    super("PARSE_ERROR", `Unexpected Vinted response (${what}): ${detail}`);
  }
}
