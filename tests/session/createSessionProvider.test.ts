import { describe, expect, it } from "vitest";
import { createSessionProvider } from "@/session/createSessionProvider.js";
import { FixedSession } from "@/session/fixedSession.js";
import { FlareSolverrSession } from "@/session/flareSolverrSession.js";
import { VintedSession } from "@/session/vintedSession.js";
import { loadConfig } from "@/config/loadConfig.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";

const marketplace = getMarketplace("it");

describe("createSessionProvider", () => {
  it("goes direct when nothing else is configured", () => {
    expect(createSessionProvider(loadConfig({}), marketplace)).toBeInstanceOf(
      VintedSession,
    );
  });

  it("uses FlareSolverr when it knows the address", () => {
    const config = loadConfig({
      VIN_FLARESOLVERR_URL: "http://flaresolverr:8191/v1",
    });

    expect(createSessionProvider(config, marketplace)).toBeInstanceOf(
      FlareSolverrSession,
    );
  });

  // Cookies lifted by hand from a real browser beat everything: they are
  // already proof that the challenge was passed.
  it("prefers explicit cookies over FlareSolverr", () => {
    const config = loadConfig({
      VIN_COOKIE: "cf_clearance=x; anon_id=y",
      VIN_FLARESOLVERR_URL: "http://flaresolverr:8191/v1",
    });

    expect(createSessionProvider(config, marketplace)).toBeInstanceOf(
      FixedSession,
    );
  });
});
