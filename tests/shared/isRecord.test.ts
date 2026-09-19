import { describe, expect, it } from "vitest";
import { isRecord } from "@/shared/isRecord.js";

describe("isRecord", () => {
  it("recognises an object indexable by key", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it.each([[null], [undefined], ["string"], [42], [[1, 2]]])(
    "rejects %s",
    (value) => {
      expect(isRecord(value)).toBe(false);
    },
  );
});
