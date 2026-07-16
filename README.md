# Contractor CFO

A personal CFO app for independent contractors — track clients, invoices, expenses,
budgets, and quarterly estimated taxes. It's a TypeScript monorepo with an Express +
Prisma/PostgreSQL API, a React (Vite) client, and an MCP server that exposes the same
data to AI agents.

## Layout

```
contractor-cfo/
├── server/            Express + Prisma API (port 32161)
├── client/            React + Vite + Tailwind UI (port 32162, proxies /api → :32161)
├── packages/shared/   Shared TypeScript types + tax-calculation logic
├── packages/mcp/      stdio MCP server exposing CFO data as agent tools
└── scripts/ports.mjs  Deterministic per-project dev ports (avoids 3000/5173 clashes)
```

npm workspaces tie it together; the `server`, `client`, and `mcp` packages all depend
on `@contractor-cfo/shared`.

### Ports

To avoid the constant collisions on the usual `3000` / `5173` defaults, dev ports are
**derived from the project name** by [`scripts/ports.mjs`](scripts/ports.mjs) — a stable
FNV-1a hash mapped into the uncommon `30000–39999` range. This repo resolves to
**server `32161`, client `32162`**. Run `node scripts/ports.mjs` to print the pair.

The client's Vite config reads this directly, so its dev port and the `/api` proxy
target always match the server. Override either service with the `PORT` (server) or
`CLIENT_PORT` (client) env vars. Copy `scripts/ports.mjs` into another project and it
gets its own unique pair automatically.

## Prerequisites

- **Node.js 20.6+** (uses the native `--env-file` flag; tested on Node 25)
- **PostgreSQL** running locally (or any reachable Postgres instance)

## Setup

From the repo root:

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build the shared package (server & client import its compiled output)
npm run build:shared

# 3. Configure environment
cp server/.env.example server/.env
#   then edit server/.env:
#     DATABASE_URL  → your Postgres connection string
#     JWT_SECRET    → a long random string (e.g. `openssl rand -hex 48`)
#     PORT          → API port (default 32161, derived from the project name)

# 4. Create the database (if it doesn't exist yet)
createdb contractor_cfo            # adjust name to match DATABASE_URL

# 5. Generate the Prisma client and apply migrations
npm run generate --workspace=server
npm run migrate:dev --workspace=server
```

> The `.env` lives in `server/` because both the Prisma CLI and the API process read
> it from that directory.

## Running

Run the API and the client in two terminals from the repo root:

```bash
# Terminal 1 — API on http://localhost:32161
npm run dev:server

# Terminal 2 — UI on http://localhost:32162 (proxies /api to the server)
npm run dev:client
```

Open http://localhost:32162 and create an account (sign up creates a household). The
client talks to the API through Vite's dev proxy, so no client-side config is needed.

### Production build

```bash
npm run build --workspace=server   # tsc → server/dist
npm run build --workspace=client   # tsc + vite → client/dist
npm run start --workspace=server   # node server/dist/server.js
```

### Run at login (macOS, optional)

`scripts/launchd/` has `launchd` plist templates to keep the server and client running
in the background. Copy the `.example` files, drop the `.example` suffix, and fill in
your own username / repo path / log locations:

```bash
cp scripts/launchd/com.contractorcfo.server.plist.example scripts/launchd/com.contractorcfo.server.plist
cp scripts/launchd/com.contractorcfo.client.plist.example scripts/launchd/com.contractorcfo.client.plist
#   then edit both: UserName, WorkingDirectory, HOME, and the two log paths

cp scripts/launchd/com.contractorcfo.server.plist ~/Library/LaunchAgents/
cp scripts/launchd/com.contractorcfo.client.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.contractorcfo.server.plist
launchctl load ~/Library/LaunchAgents/com.contractorcfo.client.plist
```

The filled-in `.plist` files are gitignored since they embed a local username and
absolute paths.

## MCP server (optional)

`packages/mcp` is a stdio MCP server that lets an AI agent read/write your CFO data via
the API using a Personal Access Token.

```bash
npm run build:mcp                                   # builds packages/mcp/dist
cp .mcp.json.example .mcp.json                      # then fill in CFO_PAT
```

Generate a Personal Access Token from the app's **Settings** page (it calls the
`/api/tokens` endpoint) and paste it into `.mcp.json` as `CFO_PAT`. Point
`CFO_API_BASE_URL` at your running API (default `http://localhost:32161`).

## Generating invoices with Claude

Once the MCP server above is configured, you can hand Claude a plain-text time log and
have it look up the client, number the invoice correctly, and produce the PDF — no
manual API calls needed.

- **In an interactive Claude Code session in this repo**, the built-in `/invoice` skill
  (`.claude/skills/invoice/SKILL.md`) drives the whole flow automatically.
- **In Claude Desktop or another MCP client**, connect via `.mcp.json` and just ask in
  natural language ("bill Acme Co for this week") — Claude uses the `create_invoice`,
  `list_invoices`, and related MCP tools directly.

### The time-log template

Paste your hours in this format so Claude parses them consistently, regardless of which
client or Claude instance is generating the invoice:

```
<Client name>

Jun 15 - 3 hrs
- meetings
- Commerce SDK planning

Jun 17 - 5.5 hrs
- API integration
- bug fixes
```

Claude follows the same rules for every invoice built from this template:

- **One line item per day**, combining that day's bullets into a single description
  (`"Jun 15, 2026 — meetings; Commerce SDK planning"`), billed at `quantity = hours`
  and `unitPrice = that client's hourlyRate` — looked up from the API, never guessed.
- **Invoice numbers and payment terms come from the client's own history**, not the
  API's generic `INV-YYYY-NNN` auto-numbering. Claude reads the client's most recent
  invoice to find their prefix (e.g. `WF-2026-NNN`) and terms (e.g. Net 15) and matches
  them, so every invoice for a given client stays consistent even across sessions.
- **The API is always the source of truth** — client IDs, rates, and invoice history are
  looked up, not fabricated, and the line-item math is checked against the total before
  anything is created.

You're free to adapt the template per client — add a project code, split hours
differently, whatever fits how you track time. The one part worth keeping consistent is
the `<date> - <hours>` header on each block, since that's what Claude parses into line
items. For a client billed on a different basis entirely (fixed fee, retainer), just say
so in the prompt — explicit instructions override the default template.

Other things you can ask Claude for once connected: `list_invoices`,
`get_overdue_invoices`, `mark_invoice_sent`, `record_payment`, `list_transactions` — see
[packages/mcp/src/tools](packages/mcp/src/tools) for the full tool list.

## Useful scripts (repo root)

| Command                              | What it does                          |
| ------------------------------------ | ------------------------------------- |
| `npm run dev:server`                 | Run the API in watch mode             |
| `npm run dev:client`                 | Run the Vite dev server               |
| `npm run build:shared`               | Compile the shared types package      |
| `npm run build:mcp`                  | Compile the MCP server                |
| `npm run typecheck`                  | Typecheck all workspaces              |
| `npm run migrate:dev --workspace=server` | Create/apply a dev migration      |
| `npm run generate --workspace=server`    | Regenerate the Prisma client      |
