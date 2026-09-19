import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_USER_AGENT } from "@/config/defaultUserAgent.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { isRecord } from "@/shared/isRecord.js";
import { VintedSession } from "@/session/vintedSession.js";

const marketplace = getMarketplace(process.argv[2] ?? "it");
const query = process.argv[3] ?? "nike air max";
const fixtures = fileURLToPath(new URL("../tests/fixtures/", import.meta.url));

const session = await new VintedSession({
  marketplace,
  userAgent: DEFAULT_USER_AGENT,
  timeoutMs: 20_000,
}).get();

const headers: Record<string, string> = {
  "User-Agent": DEFAULT_USER_AGENT,
  Cookie: session.cookie,
  Locale: marketplace.locale,
  Platform: "web",
  "X-Next-App": "marketplace-web",
  Referer: `https://${marketplace.host}/`,
};
if (session.anonId !== null) {
  headers["X-Anon-Id"] = session.anonId;
}

const search = await fetch(
  `https://${marketplace.apiHost}/svc-catalogue/items?search_text=${encodeURIComponent(query)}&per_page=5&page=1&order=relevance`,
  { headers: { ...headers, Accept: "application/json" } },
);
const payload: unknown = await search.json();
const items =
  isRecord(payload) && Array.isArray(payload["items"]) ? payload["items"] : [];
const first = items[0];
const itemId = isRecord(first) ? first["id"] : undefined;
writeFileSync(
  `${fixtures}search-${marketplace.id}.json`,
  `${JSON.stringify(payload, null, 2)}\n`,
);

if (typeof itemId !== "number") {
  throw new Error("La ricerca non ha restituito articoli da catturare.");
}
const page = await fetch(`https://${marketplace.host}/items/${itemId}`, {
  headers: { ...headers, Accept: "text/html" },
});
const html = await page.text();
// La pagina intera sono megabyte di bundle Next: al parser servono solo la
// head e i blocchi JSON-LD, e una fixture piccola resta leggibile in una diff.
const head = html.slice(0, html.indexOf("</head>") + "</head>".length);
const ldJson = [
  ...html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
  ),
].map((match) => match[0]);
if (ldJson.length === 0) {
  throw new Error(
    "La pagina articolo non contiene JSON-LD: parser da rivedere.",
  );
}
const trimmed = `${head}<body>\n${ldJson.join("\n")}\n</body></html>\n`;
writeFileSync(`${fixtures}item-${marketplace.id}.html`, trimmed);

process.stderr.write(
  `Catturate ${items.length} card e l'articolo ${itemId}.\n`,
);
