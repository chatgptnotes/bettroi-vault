---
department: general
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [adr, architecture]
---

# ADR 0001 · Obsidian vault as the source of truth for SOPs and agent persona packs

**Status:** Accepted, 2026-05-10
**Decision-makers:** Bettroi engineering (Hope Hospital tenant)

## Context

The Bettroi Business Brain platform requires a corpus of organisational knowledge that the AI agents ground on (SOPs, escalation rules, brand guides, persona packs). Multiple options exist:

- Author directly in the application repo (`adamrit/agents/`).
- Author in a Notion / Confluence workspace, sync via API.
- Author in a markdown vault using Obsidian, sync via git + GitHub Action.

The corpus is also expected to be reused across multiple Bettroi products (adamrit, PLCAutoPilot, future) — locking it inside one product repo would force duplication.

## Decision

Use a standalone **Obsidian vault** at `D:\Bettroi-Vault\`, mirrored to `chatgptnotes/bettroi-vault` (private GitHub repo). Sync via Obsidian Git plugin (auto-commit + push every 10 min). A GitHub Action on push to `main` uploads changed `.md` files into the `agent-corpus` Supabase Storage bucket of every subscribed project (currently: adamrit). The Storage webhook then triggers the project's `agent-ingest` Edge Function for chunking + embedding.

## Why Obsidian specifically

- **Output is plain markdown + YAML frontmatter** — exactly the input shape for RAG ingestion. No format translation.
- **Wikilinks** become semantic backlinks visible while authoring; chunks containing `[[X]]` get stronger retrieval.
- **Frontmatter** maps 1:1 to per-chunk metadata (`department`, `agent_pack`, `sensitivity`, `status`, `tags`).
- **Folder structure** maps 1:1 to retrieval filters.
- **No vendor lock-in** — the vault is a folder of files. We can move off Obsidian without migration.

## Why a separate repo (not a subfolder of adamrit)

- The vault will eventually serve multiple Bettroi projects. Embedding it in adamrit creates a circular dependency.
- Different access patterns: code repo gets PRs from many engineers; vault gets edits from the operations team in Obsidian.
- Different audit chain: SOP changes need their own review cycle, separate from code review.

## Why GitHub Action sync (not webhook from GitHub direct to Supabase)

- Supabase Storage doesn't natively pull from GitHub.
- A GitHub Action gives us:
  - Frontmatter validation before upload.
  - Diff-aware uploads (only changed files).
  - Honoring of `status: retired` to delete from the bucket.
  - One-line replay via `workflow_dispatch`.

## Consequences

- **Pro:** SOPs are versioned, reviewable in PRs, automatically indexed.
- **Pro:** Operations team edits in a friendly tool, not a code editor.
- **Pro:** Reusable across products — adamrit and PLCAutoPilot can both subscribe.
- **Con:** ~10 min sync delay (acceptable for v1; webhook-based real-time can be added later).
- **Con:** Service-role key for the adamrit Supabase project must be stored as a GitHub Secret on the vault repo.

## Alternatives considered

- **Notion + API sync** — heavier integration, worse markdown export, paid seat per user.
- **Direct authoring in adamrit/agents/** — couples SOPs to one project, blocks reuse.
- **Confluence** — heavy, not markdown-native, paid.

## Open follow-ups

- Real-time sync (webhook from GitHub directly to a fan-out Edge Function) if the 10-min delay becomes a pain.
- Multi-project subscription model: when a second project (e.g. PLCAutoPilot) wants to consume the vault, extend the GitHub Action with a matrix of subscriber Supabase projects, not a single one.
