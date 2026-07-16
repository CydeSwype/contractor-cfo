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

`packages/mcp` is a **stdio** MCP server that runs on your own machine and lets an AI
agent read/write your CFO data through your locally-running API, authenticated with a
Personal Access Token (PAT). It only ever talks to `CFO_API_BASE_URL` — nothing about
your data goes anywhere else, and nothing outside your machine can reach it. Because it
uses stdio (not a public HTTP endpoint), a sandboxed or remote agent can't launch or
call it directly — it has to run as a local subprocess of the MCP client (Claude
Desktop, Claude Code, etc.).

This step requires the repo to already be installed and built — if you haven't run
Setup above, do `npm install` then `npm run build:shared` first. `build:mcp` also
builds `packages/shared` for you, but still needs `npm install` to have put `tsc` in
`node_modules/.bin` beforehand.

```bash
npm run build:mcp                                   # builds packages/mcp/dist (and packages/shared)
cp .mcp.json.example .mcp.json                      # then fill in CFO_PAT
```

Generate a Personal Access Token from the app's **Settings** page and paste it into
`.mcp.json` as `CFO_PAT`. Point `CFO_API_BASE_URL` at your running API (default
`http://localhost:32161` — the server must be running locally for the MCP tools to
work; there is no hosted API to fall back to).

### Token scopes

Give an AI agent the narrowest token that works, especially anything long-lived in an
MCP config file:

| Scope          | Can read | Can write                                   |
| -------------- | -------- | -------------------------------------------- |
| `full`         | Everything | Everything |
| `invoice_only` | Everything | Only invoices, line items, attachments, and transactions (payments) |
| `read_only`    | Everything | Nothing |

Pick a scope and an expiry when generating a token in **Settings**. For an invoicing
agent (the `/invoice` skill, or "bill this client" prompts), `invoice_only` is enough —
it can create and send invoices and record payments, but can't touch clients, expenses,
budgets, tax settings, or other tokens. Revoke a token from **Settings** as soon as
you're done with it rather than leaving it live in a config file indefinitely.

The token itself only ever belongs in `.mcp.json` (git-ignored) or your MCP client's own
config — never paste it into a chat message. If an agent asks you for one, give it
somewhere it can read the file itself (or paste it into `.mcp.json` yourself); it
shouldn't need you to type the raw value into the conversation.

### Connect from Claude Desktop

Claude Desktop reads its own config file, not this repo's `.mcp.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add a `mcpServers` entry (create the file if it doesn't exist) — `mcpServers` is a
**top-level key** in this file, not nested under anything else:

```json
{
  "mcpServers": {
    "cfo": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/contractor-cfo/packages/mcp/dist/index.js"],
      "env": {
        "CFO_API_BASE_URL": "http://localhost:32161",
        "CFO_PAT": "<your-personal-access-token-from-settings>"
      }
    }
  }
}
```

Two things that trip people up here, both different from running this repo's own
`.mcp.json` in an interactive terminal:

- **`args` needs an absolute path** to `packages/mcp/dist/index.js` — Desktop doesn't
  know this repo's working directory the way a terminal session does.
- **`command` needs the full path to `node`**, not just `"node"`. Desktop launches MCP
  servers with a minimal environment that usually doesn't include your shell's PATH
  (especially if you installed Node via nvm/Volta/Homebrew). Run `which node` in your
  terminal to find the right path.

Restart Claude Desktop after editing the config for it to pick up the new server.

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
- **Invoice numbers follow that client's own registered template, enforced by the API**
  — not inferred by pattern-matching their invoice history. Set a client's numbering
  prefix once (in **Settings → that client**, or via `update_client`'s
  `invoiceNumberPrefix`, e.g. `"WF"` → `WF-2026-NNN`) and every subsequent
  `create_invoice` call either auto-generates the next number in that sequence or
  rejects an explicit `invoiceNumber` that doesn't match it — so a mixed history (e.g.
  some invoices as `INV-YYYY-NNN`, others as `INV-YYYY-MM-NNN`) can't silently
  propagate into new invoices. A client with no prefix set still falls back to the
  shared `INV-YYYY-NNN` sequence. Payment terms (e.g. Net 15) aren't enforced the same
  way — Claude still reads the most recent invoice's `notes` field to match them.
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
