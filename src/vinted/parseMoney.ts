import { isRecord } from "@/shared/isRecord.js";
import type { Money } from "@/vinted/vintedItem.js";

export const parseMoney = (raw: unknown): Money | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const amount = raw["amount"];
  const currency = raw["currency_code"];
  if (typeof amount !== "string" || typeof currency !== "string") {
    return null;
  }
  const value = Number(amount);
  return Number.isFinite(value) ? { amount: value, currency } : null;
};
