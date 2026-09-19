import { describe, expect, it } from "vitest";
import { parseItemBox } from "@/vinted/parseItemBox.js";

describe("parseItemBox", () => {
  it("splits size from condition", () => {
    expect(parseItemBox("Nike Air", "38.5 · Buone")).toEqual({
      brand: "Nike Air",
      size: "38.5",
      condition: "Buone",
    });
  });

  it("keeps sizes that contain spaces and slashes", () => {
    expect(parseItemBox("Zara", "M / IT 42 / EU 38 · Ottime").size).toBe(
      "M / IT 42 / EU 38",
    );
  });

  // A listing with no size (books, accessories) shows condition alone.
  it("reads the only part present as the condition", () => {
    expect(parseItemBox("Mondadori", "Buone")).toEqual({
      brand: "Mondadori",
      size: null,
      condition: "Buone",
    });
  });

  it.each([[undefined], [null], [42], [""], ["   "]])(
    "empties every field when the lines are not usable strings (%s)",
    (raw) => {
      expect(parseItemBox(raw, raw)).toEqual({
        brand: null,
        size: null,
        condition: null,
      });
    },
  );
});
