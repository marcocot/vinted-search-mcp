# vinted-search-mcp

An MCP server that searches second-hand listings on Vinted. Read-only: it never
buys, makes an offer, or messages a seller.

Two tools:

| Tool | What it does |
|---|---|
| `search_items` | Searches a marketplace by text, with price range, sort order and pagination |
| `get_item` | Reads one listing from its id or from a pasted URL: description, brand, condition, category, colour, availability |

## Requirements

Node 24 or newer. No browser, no database, no login.

## Setup

```bash
pnpm install
pnpm build
claude mcp add vinted -- node /absolute/path/to/vinted-search-mcp/dist/src/server.js
```

The marketplace is fixed when the server starts. `VIN_MARKETPLACE=fr` serves
vinted.fr, `VIN_MARKETPLACE=uk` serves vinted.co.uk, and 22 domains are
supported. A client cannot switch marketplace per call, so run one server per
country you care about.

## Cloudflare, and the three ways past it

Vinted sits behind Cloudflare. A plain HTTP client works until Cloudflare
decides your address deserves a managed challenge, and from that moment every
request answers 403, whether it comes from this server, from `curl`, or from any
other library. Solving such a challenge takes a real browser running JavaScript.

The server picks one of three session strategies, in this order:

1. **`VIN_COOKIE`** holds cookies you copied from your own browser. Nothing to
   solve, nothing to refresh. When they expire, calls answer `BLOCKED` and you
   paste fresh ones.
2. **`VIN_FLARESOLVERR_URL`** points at a [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)
   instance. It solves the challenge with a real Chrome and hands back the
   cookies, which this server then reuses for cheap JSON calls. Run FlareSolverr
   on the same public address as this server: Cloudflare ties its clearance
   cookie to the address and the user agent that earned it.
3. **Direct**, the default. One GET on the marketplace home page is enough for an
   anonymous session while Cloudflare leaves you alone.

A session dies while the server runs. Cookies expire, and Cloudflare re-challenges
whenever it feels like it. On a 401 or a 403 the server refreshes the session once
and retries once. It also refreshes a session older than `VIN_SESSION_TTL_MS`
before using it, because a clearance cookie rarely survives an hour. Insisting
past that is what raises the wall, so a second 403 fails with `BLOCKED` and a
message saying which of the three strategies to reach for.

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `VIN_MARKETPLACE` | `it` | Country to serve: `it`, `fr`, `de`, `es`, `uk`, `pl`, `com`, and 15 more |
| `VIN_COOKIE` | empty | Cookies from a browser session, `name=value; name=value` |
| `VIN_FLARESOLVERR_URL` | empty | FlareSolverr endpoint, for example `http://flaresolverr:8191/v1` |
| `VIN_SESSION_TTL_MS` | `1800000` | Age at which a session gets refreshed before use |
| `VIN_SESSION_KEEPALIVE` | `false` | Refresh in the background, so nobody waits 20 seconds for a challenge |
| `VIN_RATE_LIMIT_PER_MINUTE` | `6` | Local token bucket, shared by both tools |
| `VIN_CACHE_TTL_MS` | `300000` | How long an identical search or listing stays cached in memory |
| `VIN_REQUEST_TIMEOUT_MS` | `15000` | Per-request timeout |
| `VIN_USER_AGENT` | a Chrome string | Overridden by the user agent of a solved session |
| `VIN_TRANSPORT` | `stdio` | `stdio` or `http` |

Raising `VIN_RATE_LIMIT_PER_MINUTE` is the fastest way to earn a challenge. Six
requests a minute is already generous for a chat assistant.

## HTTP transport

`stdio` opens no port and exposes nothing. Use it locally.

`VIN_TRANSPORT=http` serves three routes on `VIN_HTTP_PORT` (default 3000):

- `POST /mcp` carries the protocol and requires `Authorization: Bearer <token>`.
  Without `VIN_MCP_TOKEN`, or with a token shorter than 32 characters, the server
  refuses to start. Generate one with `openssl rand -hex 24`.
- `GET /health` answers `{"status":"ok"}` for a container probe.
- `GET /metrics` serves Prometheus counters, and disappears when you set
  `VIN_METRICS=false`. Nobody has to run Prometheus.

`VIN_HTTP_HOST` defaults to `127.0.0.1`. Behind a proxy, set it to `0.0.0.0` and
list the names clients use in `VIN_HTTP_ALLOWED_HOSTS`, or DNS rebinding
protection rejects every request.

Counters: searches, listings read, cache hits, rate-limited calls, session
refreshes, sessions blocked by the challenge, upstream errors, unexpected
response shapes.

## What the data means

Every listing is one second-hand item from one person, so two listings never
share a price the way two copies of a book do. `price` is what the seller asks.
`totalPrice` adds Buyer Protection, which is what the buyer pays.

Vinted claims a large `totalEntries` and then serves at most 10 pages of it. Sort
order decides what you see, not pagination depth.

Brand, size and condition belong in the query text. The catalogue endpoint
ignores the id filters the website uses, so this server does not pretend to offer
them.

## Trying it locally

The MCP Inspector talks to the server without a client in the middle:

```bash
pnpm build
npx @modelcontextprotocol/inspector --cli node dist/src/server.js --method tools/list
npx @modelcontextprotocol/inspector --cli node dist/src/server.js \
  -e VIN_COOKIE="$VIN_COOKIE" \
  --method tools/call --tool-name search_items --tool-arg query="nike air max"
```

Drop `--cli` and the Inspector opens its web interface instead. Pass every
`VIN_*` variable with `-e`, after the command and before `--method`: the
Inspector starts the server with a sanitised environment, so anything exported
in your shell never reaches it.

## Development

```bash
pnpm lint     # eslint, zero warnings tolerated
pnpm build    # tests run on uncompiled sources, so a type error hides without this
pnpm test     # unit and integration, offline, with the 85% coverage gate
```

Tests never touch the network. The parsers run against real captured responses in
`tests/fixtures/`, refreshed with `pnpm capture:fixtures it "nike air max"`.
Vinted changes the shape of what it returns without warning, and a stale fixture
keeps the suite green against a response nobody serves anymore.

## Contributing

Development happens on a private Forgejo instance, and this GitHub repository is
a push mirror of it. Two things follow. Issues and pull requests are welcome
here, and they get replayed into Forgejo and land back through the next sync,
under your authorship. A commit merged straight into `main` on GitHub, on the
other hand, disappears at the next mirror push, so nothing skips that path.

The gate is `pnpm lint`, `pnpm build`, `pnpm test`, in that order, with coverage
at 85% or the suite fails. `CLAUDE.md` carries the conventions the code follows.

## License

MIT. See [LICENSE](LICENSE).
