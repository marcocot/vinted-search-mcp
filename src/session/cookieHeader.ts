export const cookieHeader = (setCookie: readonly string[]): string => {
  const jar = new Map<string, string>();
  for (const raw of setCookie) {
    const [pair] = raw.split(";");
    const separator = pair?.indexOf("=") ?? -1;
    if (pair === undefined || separator <= 0) {
      continue;
    }
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    // Vinted clears access_token_web and reissues it in the same response, so
    // keeping the empty value would throw away the session just created.
    if (value.length === 0) {
      jar.delete(name);
      continue;
    }
    jar.set(name, value);
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
};
