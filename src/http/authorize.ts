import { createHash, timingSafeEqual } from "node:crypto";

// Hashing before comparing does two things: it makes the buffers equal length,
// which timingSafeEqual demands, and it stops the response time from revealing
// how long the token is.
const digest = (value: string): Buffer =>
  createHash("sha256").update(value, "utf8").digest();

export const authorize = (
  header: string | undefined,
  expected: string,
): boolean => {
  if (expected.length === 0 || header === undefined) {
    return false;
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(header.trim())?.[1];
  if (bearer === undefined) {
    return false;
  }
  return timingSafeEqual(digest(bearer), digest(expected));
};
