# vinted-search-mcp — justfile
# Usage: just <recipe>

set shell := ["bash", "-e", "-u", "-o", "pipefail", "-c"]

server    := "dist/src/server.js"
infra     := env("HOME") + "/Development/home-infra-ng"
prod_host := "vinted-search-mcp.homelab.devncode.it"
prod_url  := "https://" + prod_host + "/mcp"

default:
    @just --list --unsorted

# ─── Checks ─────────────────────────────────────────────────────────

# eslint, zero warnings tolerated
lint:
    pnpm lint

# Tests run on uncompiled TypeScript: without this a type error stays invisible
build:
    pnpm build

# Offline suite WITH the coverage gate. `pnpm vitest run` does not apply it.
test:
    pnpm test

# The full gate, the one every task has to pass
ci: lint build test

# ─── Session ────────────────────────────────────────────────────────

# Solves the challenge through the homelab FlareSolverr and prints cookies for .env
cookie:
    #!/usr/bin/env bash
    # Written nowhere: these are a live session and worth as much as a password.
    set -euo pipefail
    ssh ansible@192.168.178.1 'curl -s -X POST http://172.19.0.13:8191/v1 \
        -H "Content-Type: application/json" \
        -d "{\"cmd\":\"request.get\",\"url\":\"https://www.vinted.it/\",\"maxTimeout\":60000}"' \
      | python3 -c 'import json,sys; s=json.load(sys.stdin)["solution"]; \
          print("VIN_COOKIE=\"" + "; ".join(f"{c[\"name\"]}={c[\"value\"]}" for c in s["cookies"]) + "\""); \
          print("VIN_USER_AGENT=\"" + s["userAgent"] + "\"")'

# ─── Inspector (runs through npx, not a dependency) ─────────────────

# Opens the web Inspector against the stdio server, session read from .env
inspect: build
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    npx -y @modelcontextprotocol/inspector node {{server}} \
        -e VIN_COOKIE="${VIN_COOKIE:-}" -e VIN_USER_AGENT="${VIN_USER_AGENT:-}"

# Lists the exposed tools without opening a browser
inspect-tools: build
    npx -y @modelcontextprotocol/inspector --cli node {{server}} --method tools/list

# A real search: just search "nike air max"
search query: build
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    npx -y @modelcontextprotocol/inspector --cli node {{server}} \
        -e VIN_COOKIE="${VIN_COOKIE:-}" -e VIN_USER_AGENT="${VIN_USER_AGENT:-}" \
        --method tools/call --tool-name search_items \
        --tool-arg query="{{query}}" --tool-arg perPage=5

# One listing: just item 10050045007 (a URL works too)
item id: build
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    npx -y @modelcontextprotocol/inspector --cli node {{server}} \
        -e VIN_COOKIE="${VIN_COOKIE:-}" -e VIN_USER_AGENT="${VIN_USER_AGENT:-}" \
        --method tools/call --tool-name get_item --tool-arg item="{{id}}"

# ─── Production ─────────────────────────────────────────────────────

# Lists the tools production exposes
tools-prod:
    #!/usr/bin/env bash
    set -euo pipefail
    T=$(just _prod-token)
    npx -y @modelcontextprotocol/inspector --cli {{prod_url}} \
        --transport http --header "Authorization: Bearer ${T}" --method tools/list

# A real search against production: just search-prod "nike air max"
search-prod query:
    #!/usr/bin/env bash
    set -euo pipefail
    T=$(just _prod-token)
    npx -y @modelcontextprotocol/inspector --cli {{prod_url}} \
        --transport http --header "Authorization: Bearer ${T}" \
        --method tools/call --tool-name search_items --tool-arg query="{{query}}"

# Service status in production
status-prod:
    @curl -fsS "https://{{prod_host}}/health" && echo ""
    @curl -fsS "https://{{prod_host}}/metrics" | grep -E "_total [0-9]+" | sed 's/^/  /'

# ─── Fixtures ───────────────────────────────────────────────────────

# Recaptures the real parser fixtures: just capture it "nike air max"
capture marketplace="it" query="nike air max":
    pnpm capture:fixtures {{marketplace}} "{{query}}"

# ─── Internal ───────────────────────────────────────────────────────

# Reads the production token from the Ansible vault. Prints it nowhere else.
_prod-token:
    @cd {{infra}} && uv run ansible-vault view inventory/production/group_vars/all/vault.yml \
        | grep '^vault_vinted_search_mcp_token:' | sed 's/.*: *//' | tr -d '"'"'"' '
