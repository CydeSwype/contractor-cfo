---
name: invoice
description: Turn a pasted daily time log into a client invoice via the CFO API — looks up the client's rate and numbering pattern, formats line items, creates the invoice, and generates the PDF. Use when the user pastes hours worked (e.g. "Jun 15 - 3 hrs / - bullet / - bullet...") and wants an invoice created, or asks to "make the biweekly invoice" / "bill <client>".
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# /invoice — Generate a client invoice from a time log

Arguments passed: `$ARGUMENTS` — may contain the client name and/or the pasted
time log. If either is missing, ask for it (don't guess the client if more
than one is plausible).

This project's API is the source of truth — never fabricate invoice numbers,
rates, or client details; always look them up.

## 1. Get the API token and base URL

Read `.mcp.json` in the repo root and pull `mcpServers.cfo.env.CFO_API_BASE_URL`
and `CFO_PAT`. If the file or the token is missing, ask the user to generate a
Personal Access Token from the app's Settings page and paste it — then save
it into `.mcp.json` (create from `.mcp.json.example` if needed) so future runs
don't need to ask again. Never print the raw token in your response or store
it anywhere other than `.mcp.json` (it's git-ignored).

If the server isn't reachable at that base URL, start it: this repo derives
its dev port deterministically (`node scripts/ports.mjs`), and there's a
`.claude/launch.json` with a `server` config — use the preview tool to start
it, or tell the user to run `npm run dev:server`.

## 2. Resolve the client

`GET {base}/cfo/clients` (Bearer auth). Match by name (case-insensitive,
partial ok). Pull `id`, `hourlyRate`, and `invoiceNotes`/`notes` (payment
terms, mailing address). If no match or ambiguous, list the options and ask.

## 3. Determine the invoice number and dates

`GET {base}/cfo/invoices?clientId={id}` and sort by invoice number. This
project's invoices are NOT auto-numbered per client (the API's
auto-generator uses a shared `INV-YYYY-NNN` sequence) — each client instead
has its own prefix (e.g. `WF-2026-NNN`). Read the prefix and last sequence
number from the most recent invoice for this client and increment it. If
this is the client's first invoice, ask the user what number/prefix to use.

- `issuedAt`: today's date, unless the user specifies otherwise.
- `dueAt`: default to Net 15 from `issuedAt` unless the client's notes or a
  prior invoice's `notes` field say otherwise (e.g. Net 30) — check the last
  invoice's payment terms and match them.

## 4. Parse the time log into line items

Expect input shaped like:

```
Jun 15 - 3 hrs
- meetings
- Commerce SDK planning
```

For each date block, produce ONE line item combining that day's bullets:

```
description: "Jun 15, 2026 — meetings; Commerce SDK planning"
quantity: <hrs for that day>
unitPrice: <client's hourlyRate>
```

Join bullets with `; `, capitalize the first word of the joined description
naturally, and use the year implied by context (ask if ambiguous, e.g. near
year boundary). Skip blank days. Sort line items by date ascending.

## 5. Create the invoice

`POST {base}/cfo/invoices` with `{ clientId, invoiceNumber, issuedAt, dueAt,
notes, lineItems }`. Set `notes` to something like `"Net 15. Service period
<first date>–<last date>, <year>."` matching the client's prior style.

Show the returned `total` and sanity-check it: sum(quantity × unitPrice)
across your line items should match — recompute by hand if in doubt before
calling the API, since a mistake here creates a real invoice record.

## 6. Generate and save the PDF

`GET {base}/cfo/invoices/{id}/pdf` (Bearer auth), save the response body to
`<INVOICE-NUMBER>.pdf` in the repo root (or wherever the user keeps them —
check for a prior invoice PDF's location first). This also registers the
generated PDF as an attachment on the invoice server-side.

## 7. Report back

Summarize: client, period, total hours, total amount, issued/due dates,
invoice number, and where the PDF was saved. Don't re-paste the full line
item table — the PDF has it.
