import { createLogger } from "@/logger/createLogger.js";
import { logToolCall } from "@/tools/logToolCall.js";
import { describe, expect, it } from "vitest";

const capture = () => {
  const lines: string[] = [];
  return { lines, logger: createLogger((line) => lines.push(line)) };
};

describe("logToolCall", () => {
  // The field names are the contract the Grafana table reads, and they are the
  // same in every MCP server here.
  it("writes one line a dashboard can put in a table", () => {
    const { lines, logger } = capture();

    logToolCall(logger, {
      tool: "search_items",
      summary: "nike air max 42, fino a 60€",
      results: 23,
      cached: false,
      ms: 812,
    });

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "info",
      message: "tool_call",
      tool: "search_items",
      summary: "nike air max 42, fino a 60€",
      results: 23,
      cached: false,
      ms: 812,
    });
  });

  it("leaves out what a tool cannot report", () => {
    const { lines, logger } = capture();

    logToolCall(logger, { tool: "get_item", summary: "Nike Air Max", ms: 4 });
    const written: Record<string, unknown> = JSON.parse(lines[0] ?? "");

    expect("results" in written).toBe(false);
    expect("cached" in written).toBe(false);
  });
});
