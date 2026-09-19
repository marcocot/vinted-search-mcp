import { describe, expect, it } from "vitest";
import { parseMoney } from "@/vinted/parseMoney.js";

describe("parseMoney", () => {
  it("converte la coppia importo/valuta di Vinted", () => {
    expect(parseMoney({ amount: "58.45", currency_code: "EUR" })).toEqual({
      amount: 58.45,
      currency: "EUR",
    });
  });

  it.each([
    [null],
    ["58.45"],
    [{ amount: 58.45, currency_code: "EUR" }],
    [{ amount: "58.45" }],
    [{ amount: "not a number", currency_code: "EUR" }],
  ])("restituisce null per %s", (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});
