import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class InvalidItemIdError extends VintedMcpError {
  constructor(input: string) {
    super(
      "INVALID_ITEM_ID",
      `"${input}" is neither a Vinted item id nor a Vinted item URL.`,
    );
  }
}
