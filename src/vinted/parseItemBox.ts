import type { VintedItem } from "@/vinted/vintedItem.js";

// The second line of a card reads "size · condition", and size is missing from
// anything that has no size (books, accessories). With one part left, what
// remains is always the condition.
const nonEmpty = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseItemBox = (
  firstLine: unknown,
  secondLine: unknown,
): Pick<VintedItem, "brand" | "size" | "condition"> => {
  const brand = nonEmpty(firstLine);
  const parts =
    typeof secondLine === "string"
      ? secondLine
          .split("·")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
      : [];
  if (parts.length >= 2) {
    return { brand, size: parts[0] ?? null, condition: parts[1] ?? null };
  }
  return { brand, size: null, condition: parts[0] ?? null };
};
