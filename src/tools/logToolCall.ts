import type { Logger } from "@/logger/logger.js";

type ToolCall = {
  tool: string;
  // What was asked for, in the words a person would use, so a dashboard can
  // show a search without anybody reading a query string.
  summary: string;
  results?: number;
  cached?: boolean;
  ms: number;
};

// One line per call that worked, with the same field names in every MCP server
// here, so a single Loki query can put them all in one table. Failures keep
// going through logToolFailure.
export const logToolCall = (logger: Logger, call: ToolCall): void => {
  logger.info("tool_call", {
    tool: call.tool,
    summary: call.summary,
    ...(call.results === undefined ? {} : { results: call.results }),
    ...(call.cached === undefined ? {} : { cached: call.cached }),
    ms: call.ms,
  });
};
