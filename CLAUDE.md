# vinted-search-mcp

MCP server that searches Vinted listings. TypeScript ESM, Node 24+, no browser
and no database.

## Commands

| | |
|---|---|
| `pnpm build` | compiles into `dist/` (`tsc` plus `tsc-alias` for the `@/` aliases) |
| `pnpm test` | unit and integration, offline, **with** the coverage gate (85%) |
| `pnpm vitest run` | same suite **without** the gate, which is not a substitute |
| `pnpm lint` | eslint with `--max-warnings 0` and `--no-cache` |
| `pnpm capture:fixtures it "nike air max"` | recaptures the real parser fixtures |

Run the whole gate before every commit, in this order:

```bash
pnpm lint
pnpm build
pnpm test
```

`pnpm build` belongs in the gate because tests run on uncompiled sources. Skip
it and a type error stays invisible until somebody builds for real.

## TypeScript conventions

- **One export per file.** More than one almost always means two
  responsibilities waiting to be split. The exception is types that group
  logically: `vinted/vintedItem.ts` holds `Money`, `Seller`, `VintedItem` and
  `ItemDetail`.
- **File names are always camelCase**, and match the symbol they export:
  `vintedHttp.ts` for `class VintedHttp`, `transportHandle.ts` for
  `type TransportHandle`, `searchUrl.ts` for `const searchUrl`. Classes, types
  and interfaces stay PascalCase in code.
- **`const name = () => {}`**, not `function name()`. Class methods stay
  methods: they live on the prototype, subclasses override them, and
  `vi.spyOn(Class.prototype, ...)` reaches them, none of which a per-instance
  arrow field allows.
- **Imports always use the `@/` alias.** eslint enforces it.
- **No `as`.** The linter forbids it, so narrowing goes through type guards
  (`shared/isRecord.ts`). One exception carries its own explanation, in
  `http/startHttpServer.ts`: the MCP SDK declares `onclose` as an accessor
  while `Transport` declares it as an optional field, and under
  `exactOptionalPropertyTypes` the two do not meet.
- **No god classes, SOLID first.** `VintedHttp` carries a request wearing a
  session, `CatalogueSource` turns responses into domain objects, `searchUrl`
  builds a URL. `CatalogueSource` depends on `HttpClient`, not on the
  implementation behind it.
- **Folders follow responsibility**, and none of them holds thirty files:
  session lifetime lives in `src/session/`, the catalogue in `src/catalogue/`.
- **`tests/` mirrors `src/`**, file by file.
- **Nothing is exported unless something else imports it.**
- Comments stay rare: why a choice was made, never what the code does.

## Language

Everything is in English: code, comments, test names, commit messages,
documentation. The only Italian lives inside `tests/fixtures/`, which holds real
Vinted pages captured as they were served.

Public prose (README, tool descriptions, error messages) goes through the
`stop-slop` skill before it ships. No artefact in this repository mentions
Claude, Anthropic or the use of AI.

## Architecture

Four layers, each ignorant of the one above:

- `src/server.ts` and `src/tools/` speak MCP: validate with Zod, delegate,
  format.
- `src/vinted/` is the domain. It has never heard of HTTP; it talks to
  `ItemSource`.
- `src/catalogue/` and `src/session/` handle network and parsing, and implement
  `ItemSource`.
- `src/storage/` holds the TTL cache and the token bucket, both in memory, both
  reset by a restart.

Two tools, two services, one `ItemSource` (`CatalogueSource`). Cache and rate
limiter are shared: the request budget belongs to the site, not to the tool.

## What Vinted costs to learn twice

- **`/api/v2/catalog/items` is dead.** It answers 404 on every domain, and every
  npm package still in circulation stops there. The catalogue lives at
  `https://api.<domain>/svc-catalogue/items`, on the `api.` host, not `www.`.
- **The JSON item endpoint is blocked**: `/api/v2/items/{id}/details` answers
  403. The only source served to a browserless client is the `Product` JSON-LD
  inside the public page.
- **Id filters do nothing** on `svc-catalogue`: `brand_ids`, `status_ids` and
  `catalog_ids` are ignored in every spelling (`brand_ids`, `brand_ids[]`,
  `brand_id`). Only `search_text`, `price_from`, `price_to`, `order`, `page` and
  `per_page` survive. The same filters do work on `www.<domain>/catalog?...`,
  which server-renders results inside the Next.js RSC payload. That is the road
  to take if filtering by brand ever becomes necessary.
- **`total_entries` is a claim**, not something you can reach: pagination stops
  at 10 pages of 96.
- **Brand, size and condition arrive pre-formatted** inside `item_box`, as two
  strings: `first_line` is the brand, `second_line` reads "size · condition",
  and the size is missing from anything that has no size.
- **cf_clearance is tied to the IP address and the user agent** that solved the
  challenge. That is why `VintedHttp` prefers the session's own agent, and why
  FlareSolverr has to leave from the same public address as this server.

## What the logs carry

Every tool call that works writes one line, and the Grafana table "Ultime
ricerche" is built on it:

```json
{"ts":"…","level":"info","message":"tool_call","tool":"search_items",
 "summary":"nike air max 42, fino a 60€","results":88,"cached":false,"ms":812}
```

`summary` is the query in the words a person would use, which is the whole
point: reading a search off a dashboard should not mean reading a query
string. The field names are the same in every MCP server here, so one Loki
query puts all of them in one table. Amazon predates the contract and writes
`event`/`query`/`cacheHit`/`durationMs` instead; the dashboard folds the two
vocabularies together with `label_format` rather than renaming fields its own
tests assert.

## Non-negotiable rules

- **`ParseError` is not "no results".** The first says Vinted changed the shape
  of its response and the server is about to invent something; the second is a
  legitimate answer. One missing field on a valid card is `null`; a missing id
  or title is a `ParseError`.
- **No network calls in the test suite.** Parsers run on captured fixtures, and
  `tests/live/` is no part of `pnpm test`.
- **A 403 earns one refresh and one retry.** Pushing past that is what raises
  the wall.
- **stdout belongs to the MCP protocol.** Diagnostics go to stderr through
  `logger/createLogger.ts`.
- **No log may carry a secret.** `logger/redact.ts` hides cookies, tokens and
  anon ids even when nested, which is a safety net, not permission to pass them.
- **The token comparison in `http/authorize.ts` uses `timingSafeEqual` over
  SHA-256 digests**, and the 401 never says what was wrong.
- **`enableDnsRebindingProtection` and `allowedHosts` stay on.** The host list
  gets built after `listen`, because with `VIN_HTTP_PORT=0` the system picks the
  real port.
- **A counter added to `MetricName` needs its description in `COUNTERS`** inside
  `http/renderMetrics.ts`, or the build fails. A compile error beats a series
  that quietly leaves Grafana.

## Versioning

git, Conventional Commits, one line in English, no body unless a breaking
change needs justifying.
