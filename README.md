# Contractor CFO

A personal CFO app for independent contractors — track clients, invoices, expenses,
budgets, and quarterly estimated taxes. It's a TypeScript monorepo with an Express +
Prisma/PostgreSQL API, a React (Vite) client, and an MCP server that exposes the same
data to AI agents.

## Layout

```
contractor-cfo/
├── server/            Express + Prisma API (port 3000)
├── client/            React + Vite + Tailwind UI (port 5173, proxies /api → :3000)
├── packages/shared/   Shared TypeScript types + tax-calculation logic
└── packages/mcp/      stdio MCP server exposing CFO data as agent tools
```

npm workspaces tie it together; the `server`, `client`, and `mcp` packages all depend
on `@contractor-cfo/shared`.

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
#     PORT          → API port (default 3000)

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
# Terminal 1 — API on http://localhost:3000
npm run dev:server

# Terminal 2 — UI on http://localhost:5173 (proxies /api to the server)
npm run dev:client
```

Open http://localhost:5173 and create an account (sign up creates a household). The
client talks to the API through Vite's dev proxy, so no client-side config is needed.

### Production build

```bash
npm run build --workspace=server   # tsc → server/dist
npm run build --workspace=client   # tsc + vite → client/dist
npm run start --workspace=server   # node server/dist/server.js
```

## MCP server (optional)

`packages/mcp` is a stdio MCP server that lets an AI agent read/write your CFO data via
the API using a Personal Access Token.

```bash
npm run build:mcp                                   # builds packages/mcp/dist
cp .mcp.json.example .mcp.json                      # then fill in CFO_PAT
```

Generate a Personal Access Token from the app's **Settings** page (it calls the
`/api/tokens` endpoint) and paste it into `.mcp.json` as `CFO_PAT`. Point
`CFO_API_BASE_URL` at your running API (default `http://localhost:3000`).

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
```
