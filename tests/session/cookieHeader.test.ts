import { describe, expect, it } from "vitest";
import { cookieHeader } from "@/session/cookieHeader.js";

describe("cookieHeader", () => {
  it("reduces Set-Cookie directives to name=value pairs", () => {
    expect(
      cookieHeader([
        "anon_id=abc; Path=/; Expires=Wed, 19 Sep 2046 08:41:41 GMT",
        "v_udt=xyz; Path=/; HttpOnly",
      ]),
    ).toBe("anon_id=abc; v_udt=xyz");
  });

  // Vinted clears access_token_web and reissues it in the same response.
  it("keeps the token reissued after the deletion", () => {
    expect(
      cookieHeader([
        "access_token_web=; Max-Age=-1; Path=/",
        "access_token_web=vero; Max-Age=604800; Path=/",
      ]),
    ).toBe("access_token_web=vero");
  });

  it("forgets a cookie deleted after being issued", () => {
    expect(
      cookieHeader(["datadome=x; Path=/", "datadome=; Max-Age=-1; Path=/"]),
    ).toBe("");
  });

  it("ignores lines without a valid pair", () => {
    expect(cookieHeader(["", "garbage", "=value-only", "a=1"])).toBe("a=1");
  });
});
