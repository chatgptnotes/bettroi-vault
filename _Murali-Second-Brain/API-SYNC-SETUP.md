# External tools → Brain sync — where the keys live & how it runs

Two team tools feed the Second Brain. Both are **your own Supabase-backed apps**,
so the sync reads their Supabase directly (like `sync-bni-contacts.mjs`) — there
is no third-party REST API to configure.

| Tool | = | Repo | Sync script | npm |
|---|---|---|---|---|
| proposalos.in | **proposifyai.com** | `chatgptnotes/proposifyai.com` | `sync-proposifyai.mjs` (already existed) | `npm run brain:sync-proposifyai` |
| pulseofproject.com | — | `chatgptnotes/pulseofproject` | `pulseofproject-sync.mjs` | `npm run brain:pulse` |

## proposalos.in = proposifyai.com — already wired

There is **no separate proposalos sync** — proposalos.in is the same product as
proposifyai.com, which already has `sync-proposifyai.mjs`. It pulls the
`proposals` table from proposifyai's Supabase, writes one markdown file per
proposal under `Proposals/{client}/`, and extracts pricing into `brain_proposals`.

- **Keys (already in `.env.local`):** `PROPOSIFY_SUPABASE_URL`, `PROPOSIFY_SUPABASE_SERVICE_KEY`
- **Where the real values come from:** the proposifyai.com Supabase project →
  Dashboard → Project Settings → API (or the repo's env / deployed env).
- **Run:** `npm run brain:sync-proposifyai`

Note: proposifyai's schema has grown (see `proposifyai/supabase/migrations/`) to
include `project_tracker`, `project_payments`, etc. If POs/invoices live in those
tables (not just `proposals`), `sync-proposifyai.mjs` can be extended to read them.

## pulseofproject.com — Supabase sync (this script)

`pulseofproject-sync.mjs` reads two tables and ingests them into `brain_chunks`:

- **`bug_reports`** — bugs + who-does-what: `project_name`, `sno`, `module`,
  `screen`, `snag`, `severity` (P1/P2/P3), `status`, `testing_status`,
  `assigned_to`, `reported_by`, `comments`.
- **`admin_projects`** — project status: `name`, `client`, `status`, `priority`,
  `progress`, `deadline`, `category`.

### Setup

1. In the pulseofproject "bugtracking" Supabase project → Dashboard → Project
   Settings → API, copy the **Project URL** and **service_role key**.
2. Add to `.env.local` (and GitHub repo secrets for CI):
   ```
   PULSE_SUPABASE_URL=...
   PULSE_SUPABASE_SERVICE_KEY=...
   ```
   (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY` are already set.)
3. Run: `npm run brain:pulse`

Delta-synced via the `brain_sync_state` table (`source = pulseofproject`), on
`updated_at`, so only changed records re-ingest. Daily GitHub Action:
`.github/workflows/brain-pulseofproject-sync.yml`.

## Verify

- Console shows `bugs: N ingested` / `projects: N ingested`.
- In Supabase, `brain_chunks` has rows with `source_type = 'pulseofproject'`.
- `npm run brain:ask "what P1 bugs are open and who owns them"` returns them.
