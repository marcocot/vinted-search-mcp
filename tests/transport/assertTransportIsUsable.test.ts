import { describe, expect, it } from "vitest";
import { loadConfig } from "@/config/loadConfig.js";
import { assertTransportIsUsable } from "@/transport/assertTransportIsUsable.js";
import { ConfigError } from "@/vinted/errors/configError.js";

const token = "0123456789abcdef0123456789abcdef";

describe("assertTransportIsUsable", () => {
  it("lets stdio through, since it opens no port", () => {
    expect(() => assertTransportIsUsable(loadConfig({}))).not.toThrow();
  });

  it("accepts http with a long enough token", () => {
    expect(() =>
      assertTransportIsUsable(
        loadConfig({ VIN_TRANSPORT: "http", VIN_MCP_TOKEN: token }),
      ),
    ).not.toThrow();
  });

  // An HTTP server that starts unauthenticated is the worst outcome.
  it("refuses to start http without a token", () => {
    expect(() =>
      assertTransportIsUsable(loadConfig({ VIN_TRANSPORT: "http" })),
    ).toThrow(ConfigError);
  });

  it("refuses to start http with a short token", () => {
    expect(() =>
      assertTransportIsUsable(
        loadConfig({ VIN_TRANSPORT: "http", VIN_MCP_TOKEN: "corto" }),
      ),
    ).toThrow(/at least 32/);
  });
});
