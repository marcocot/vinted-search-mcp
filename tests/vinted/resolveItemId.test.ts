import { describe, expect, it } from "vitest";
import { InvalidItemIdError } from "@/vinted/errors/invalidItemIdError.js";
import { resolveItemId } from "@/vinted/resolveItemId.js";

describe("resolveItemId", () => {
  it.each([
    ["10052431430", "10052431430"],
    ["  10052431430 ", "10052431430"],
    ["https://www.vinted.it/items/10052431430-nike-air-max", "10052431430"],
    ["https://www.vinted.fr/items/10052431430", "10052431430"],
    ["https://www.vinted.it/items/10052431430?ref=feed", "10052431430"],
  ])("resolves %s", (input, expected) => {
    expect(resolveItemId(input)).toBe(expected);
  });

  it.each(["", "abc", "12", "https://www.vinted.it/catalog?search_text=nike"])(
    "rejects %s",
    (input) => {
      expect(() => resolveItemId(input)).toThrow(InvalidItemIdError);
    },
  );
});
