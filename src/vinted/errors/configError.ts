import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

export class ConfigError extends VintedMcpError {
  constructor(message: string) {
    super("CONFIG_ERROR", message);
  }
}
