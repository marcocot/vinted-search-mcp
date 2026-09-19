import { describe, expect, it } from "vitest";
import { createLogger } from "@/logger/createLogger.js";

describe("createLogger", () => {
  it("writes one JSON line per level", () => {
    const lines: string[] = [];
    const logger = createLogger(
      (line) => lines.push(line),
      () => "2026-01-01T00:00:00.000Z",
    );

    logger.debug("d");
    logger.info("i", { a: 1 });
    logger.warn("w");
    logger.error("e");

    expect(lines).toHaveLength(4);
    expect(JSON.parse(lines[1] ?? "")).toEqual({
      ts: "2026-01-01T00:00:00.000Z",
      level: "info",
      message: "i",
      a: 1,
    });
  });

  it("never leaks a cookie passed as a field", () => {
    const lines: string[] = [];
    createLogger((line) => lines.push(line)).warn("sessione", {
      cookie: "access_token_web=segreto",
    });
    expect(lines[0]).not.toContain("segreto");
  });
});
