import { describe, expect, it } from "vitest";
import { redact } from "@/logger/redact.js";

describe("redact", () => {
  it("hides the fields that would carry a session into the logs", () => {
    expect(
      redact({
        cookie: "access_token_web=abc",
        "X-Anon-Id": "u-1",
        nested: { Authorization: "Bearer x", ok: 1 },
        list: [1, 2],
        plain: "visibile",
      }),
    ).toEqual({
      cookie: "[redacted]",
      "X-Anon-Id": "[redacted]",
      nested: { Authorization: "[redacted]", ok: 1 },
      list: [1, 2],
      plain: "visibile",
    });
  });

  it("lets null through without mistaking it for an object", () => {
    expect(redact({ value: null })).toEqual({ value: null });
  });
});
