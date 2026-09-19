import type { Config } from "@/config/config.js";
import { ConfigError } from "@/vinted/errors/configError.js";

const MIN_TOKEN_LENGTH = 32;

// An HTTP server that starts without authentication is the worst outcome
// available, so refusing to start is the right one.
export const assertTransportIsUsable = (config: Config): void => {
  if (config.transport !== "http") {
    return;
  }
  if (config.mcpToken.length === 0) {
    throw new ConfigError(
      "VIN_MCP_TOKEN is required when VIN_TRANSPORT=http. Refusing to start unauthenticated.",
    );
  }
  if (config.mcpToken.length < MIN_TOKEN_LENGTH) {
    throw new ConfigError(
      `VIN_MCP_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters.`,
    );
  }
};
