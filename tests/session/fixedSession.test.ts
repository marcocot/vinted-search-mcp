import { describe, expect, it } from "vitest";
import { FixedSession } from "@/session/fixedSession.js";

describe("FixedSession", () => {
  it("pulls the anon id out of the pasted cookies", async () => {
    const session = new FixedSession(
      " cf_clearance=x; anon_id=abc-1; access_token_web=t ",
      "Chrome/152",
    );

    await expect(session.get()).resolves.toEqual({
      cookie: "cf_clearance=x; anon_id=abc-1; access_token_web=t",
      anonId: "abc-1",
      userAgent: "Chrome/152",
    });
  });

  it("copes with cookies that carry no anon id", async () => {
    const session = await new FixedSession("cf_clearance=x").get();

    expect(session.anonId).toBeNull();
    expect(session.userAgent).toBeNull();
  });

  // Nothing here refreshes: when they expire, the 403 that follows says so.
  it("returns the same session every time, refresh included", async () => {
    const session = new FixedSession("anon_id=abc-1");

    await expect(session.refresh()).resolves.toEqual(await session.get());
  });
});
