import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

const describe = (error: unknown): string => {
  if (error instanceof VintedMcpError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `UNKNOWN: ${error.message}`;
  }
  return `UNKNOWN: ${String(error)}`;
};

export const toolError = (error: unknown): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: describe(error) }],
});
