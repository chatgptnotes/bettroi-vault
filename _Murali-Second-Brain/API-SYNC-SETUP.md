# proposalos.in + pulseofproject.com → Brain sync — setup

Two sync scripts pull external data into `brain_chunks` so it is RAG-queryable,
modeled on `fathom-sync.mjs`. They run daily via GitHub Actions and can be run
locally with the npm scripts.

| Source | Script | npm | Off-limits? |
|---|---|---|---|
| proposalos.in (proposals, POs, invoices) | `proposalos-sync.mjs` | `npm run brain:proposalos` | Yes (financial) |
| pulseofproject.com (bugs, who-does-what) | `pulseofproject-sync.mjs` | `npm run brain:pulse` | No |

## 1. Set the env vars

Add to `.env.local` (for local runs) AND to the GitHub repo secrets (for CI):

```
PROPOSALOS_API_URL=https://proposalos.in/api
PROPOSALOS_API_KEY=...
PULSE_API_URL=https://pulseofproject.com/api
PULSE_API_KEY=...
```

`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `OPENAI_API_KEY` are already configured.

## 2. Adapt the CONFIG block to each real API

Each script has a clearly marked `── CONFIG ──` section at the top. That is the
only part to change once you have the API docs:

- **`listUrl(since)`** — the endpoint + query param that lists records modified
  since a timestamp. Default assumes `GET {API_URL}/documents?updated_since=...`
  (proposalos) and `GET {API_URL}/issues?updated_since=...` (pulse).
- **`toRecord(raw)` / `toItem(raw)`** — maps the API's JSON fields to the fields
  we ingest. Defaults try the common names (`id`, `total`, `status`, `assignee`,
  etc.); fix any that do not match the real payload.
- **Auth** — both default to `Authorization: Bearer <key>`. Change the header in
  the `headers` object if the API uses a different scheme (e.g. `X-Api-Key`).

If proposalos.in / pulseofproject.com are your own Supabase-backed apps instead
of REST APIs, swap `fetchDocuments` / `fetchItems` to use a Supabase client
exactly like `sync-bni-contacts.mjs` does.

## 3. Run

```
npm run brain:proposalos
npm run brain:pulse
```

Each tracks its own cursor in the `brain_sync_state` table (`source` =
`proposalos` / `pulseofproject`) so only new/updated records are ingested.

## 4. Verify

- Console shows `✓ Ingested N chunk(s) — [client] proposalos: proposalos://...`
- In Supabase, `brain_chunks` has rows with `source_type = 'proposalos'`
  (`off_limits = true`) and `source_type = 'pulseofproject'`.
- `npm run brain:ask "what is the total of invoice <number>"` returns the value
  (only for off-limits-enabled queries).
