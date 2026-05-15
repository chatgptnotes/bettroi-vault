---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: draft
tags: [sop, adamrit, deployment, vercel, supabase, ops]
---

# Adamrit — Deployment & Operations (Agent-Facing)

## Deployment topology

```
Browser
   │
   ▼
Vercel (static SPA from chatgptnotes/adamrit.com main branch)
   │
   ├── Vercel serverless functions (api/) — Twilio telephony, Tally export glue
   │
   ▼
Supabase project
   ├── Postgres (data + RLS)
   ├── Storage (incl. agent-corpus bucket fed by THIS vault)
   └── Edge Functions (agent-ingest = chunk + embed corpus uploads)
```

## Frontend

- **Build:** `npm run build` → Vite produces `dist/`.
- **Hosting:** Vercel auto-deploys on push to `main`.
- **Build-time guards:**
  - `check:finalbill` enforces the SHA256 lock on `src/pages/FinalBill.tsx`. A failed check blocks the deploy.
  - ESLint via `npm run lint` (typically run in CI / pre-merge).

## Backend (Supabase)

- Single Supabase project per environment.
- Schema is version-controlled as SQL migrations in `supabase/migrations/`. Apply via the Supabase Studio / CLI; the app does not auto-migrate on boot.
- After each migration, regenerate types: `npm run generate-types` (writes `src/integrations/supabase/types.ts`). **Manual step — not automated.**

## Environment variables

The Vite client reads `VITE_*`-prefixed envs (Supabase URL + anon key, app config). Server-side keys (Twilio, service role) live as Vercel project envs, not in the frontend bundle.

Canonical list lives in `.env.example` at the adamrit repo root.

## Agent-corpus sync (this vault → Adamrit Supabase)

Per [[0001-obsidian-as-source-of-truth]]:

1. Operations team edits markdown in this vault.
2. Obsidian Git auto-commits and pushes to `chatgptnotes/bettroi-vault` (~10 min cadence).
3. A GitHub Action on push to `main` reads the diff, validates frontmatter, and uploads changed `.md` files into the Adamrit Supabase project's `agent-corpus` Storage bucket.
4. A Storage webhook triggers the Adamrit `agent-ingest` Edge Function → chunks + embeds → vector store ready for agent retrieval.
5. Agents retrieve corpus content filtered by `department`, `agent_pack`, `tags`, `sensitivity`.

**`status: retired`** on a corpus file removes it from the bucket on the next sync cycle.

## Operational tasks

| Task | How |
|---|---|
| Deploy a code change | Push to `chatgptnotes/adamrit.com main`. Vercel handles the rest. |
| Apply a schema change | Add SQL migration → apply in Supabase → run `npm run generate-types` → commit the regenerated types file. |
| Publish a new SOP | Author markdown in this vault → commit → wait for the sync action. |
| Retire an SOP | Set `status: retired` in its frontmatter → commit. |
| Export to Tally | `npm run tally:sync` (or `tally:direct-sync`) from the adamrit repo. |
| Force Vercel redeploy | Empty commit with a redeploy marker (precedent: commit `792bcda`). |

## Known operational gotchas

- **Do not re-introduce a `prebuild` npm script.** It was removed (commit `038c361`) because `.vercelignore` blocked the files it depended on.
- **Do not lower the AI surgery `maxOutputTokens` below 2000.** Commit `cd6208b` raised it from 800 because outputs were truncated.
- **Do not delete `FinalBill.tsx.backup` or `FinancialSummary-backup.tsx`** — intentional historical snapshots.
- **Sidebar menu entries can be lost in refactors** — the PMJAY/MJPJAY item disappeared once (restored in `727cf81`). Verify the sidebar after touching it.

## Related

- [[adamrit-system-overview]]
- [[adamrit-supabase-schema]]
- [[0001-obsidian-as-source-of-truth]] — why the vault feeds Adamrit
- [[Build-and-Deploy]] (developer-side reference)
