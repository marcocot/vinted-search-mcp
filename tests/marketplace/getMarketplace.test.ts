import { describe, expect, it } from "vitest";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { UnknownMarketplaceError } from "@/vinted/errors/unknownMarketplaceError.js";

describe("getMarketplace", () => {
  it("points the catalogue at the api. host, not the site", () => {
    expect(getMarketplace("it")).toEqual({
      id: "it",
      host: "www.vinted.it",
      apiHost: "api.vinted.it",
      locale: "it-IT",
      currency: "EUR",
    });
  });

  it("handles compound domains and non-euro currencies", () => {
    const uk = getMarketplace("uk");
    expect(uk.host).toBe("www.vinted.co.uk");
    expect(uk.apiHost).toBe("api.vinted.co.uk");
    expect(uk.currency).toBe("GBP");
    expect(getMarketplace("pl").currency).toBe("PLN");
  });

  it("rejects an unknown marketplace and lists the known ones", () => {
    expect(() => getMarketplace("xx")).toThrow(UnknownMarketplaceError);
    expect(() => getMarketplace("xx")).toThrow(/it, fr/);
  });
});
