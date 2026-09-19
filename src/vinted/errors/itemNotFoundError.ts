import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class ItemNotFoundError extends VintedMcpError {
  constructor(id: string) {
    super("NOT_FOUND", `Item ${id} does not exist or was removed.`);
  }
}
