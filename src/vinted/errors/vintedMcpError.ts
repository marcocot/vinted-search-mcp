import type { VintedErrorCode } from "@/vinted/errors/vintedErrorCode.js";

export class VintedMcpError extends Error {
  readonly code: VintedErrorCode;

  constructor(code: VintedErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}
