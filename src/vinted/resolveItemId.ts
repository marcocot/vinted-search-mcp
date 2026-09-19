import { InvalidItemIdError } from "@/vinted/errors/invalidItemIdError.js";

const BARE_ID = /^\d{4,}$/;
const ITEM_URL = /\/items\/(\d{4,})(?:[-/?#]|$)/;

// Resolved before the cache and the rate limiter, so malformed input spends
// neither.
export const resolveItemId = (input: string): string => {
  const trimmed = input.trim();
  if (BARE_ID.test(trimmed)) {
    return trimmed;
  }
  const fromUrl = ITEM_URL.exec(trimmed);
  if (fromUrl?.[1] !== undefined) {
    return fromUrl[1];
  }
  throw new InvalidItemIdError(input);
};
