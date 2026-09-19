import { describe, expect, it } from "vitest";
import { authorize } from "@/http/authorize.js";

const token = "0123456789abcdef0123456789abcdef";

describe("authorize", () => {
  it("accepts the right token however the scheme is spelled", () => {
    expect(authorize(`Bearer ${token}`, token)).toBe(true);
    expect(authorize(`bearer ${token}`, token)).toBe(true);
    expect(authorize(`  Bearer   ${token}  `, token)).toBe(true);
  });

  const refused: [string | undefined, string][] = [
    [undefined, "header missing"],
    ["", "empty header"],
    [token, "no scheme"],
    ["Basic abc", "wrong scheme"],
    ["Bearer wrong", "wrong token"],
  ];

  it.each(refused)("refuses %s (%s)", (header) => {
    expect(authorize(header, token)).toBe(false);
  });

  // An empty expected token would authorise anyone sending an empty bearer.
  it("refuses everything when no token is expected", () => {
    expect(authorize("Bearer qualunque", "")).toBe(false);
  });
});
