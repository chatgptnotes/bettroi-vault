# Bettroi Knowledge Vault

This is the canonical source for **Standard Operating Procedures (SOPs), agent persona packs, glossaries, and architecture decisions** that the Bettroi Business Brain agents ground on.

It's an [Obsidian](https://obsidian.md) vault. Edit in Obsidian; the [Obsidian Git plugin](https://github.com/Vinzent03/obsidian-git) auto-commits + pushes to GitHub every 10 minutes; a GitHub Action then syncs every changed `.md` file into the Supabase `agent-corpus` bucket of any project that subscribes to this vault (currently: adamrit; soon: PLCAutoPilot, others).

The agents read this content via vector retrieval. Edit a file → save → in ~10–15 minutes the agents pick up the change.

## Folder map

| Folder | What it holds |
|---|---|
| `agents/` | Agent persona packs — system prompt + knowledge files + examples. One folder per agent, structured per the Business Brain loader contract. |
| `corpus/` | General SOPs, brand guides, escalation rules. Freer than `agents/`. |
| `glossary/` | Terms, acronyms, hospital abbreviations — heavily wikilinked. |
| `decisions/` | Architecture Decision Records (ADRs). One file per decision, immutable once written. |
| `_scratch/` | **Gitignored.** For drafts, real-data debugging, and anything that might contain PHI. Never committed. |

## Frontmatter is required

Every `.md` file in `agents/` and `corpus/` must start with YAML frontmatter:

```yaml
---
department: pharmacy | patient-facing | clinical | general
agent_pack: <slug-or-omit>
sensitivity: public | internal | restricted
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft | approved | retired
tags: [sop, escalation, regulated]
---
```

Without `department` the indexer skips the file and logs a warning. `status: retired` deletes the file's chunks from `agent_chunks` on the next sync.

## What goes in here vs what does NOT

| ✅ In the vault | ❌ Not in the vault |
|---|---|
| SOPs, procedures, escalation rules | Patient data (PHI) |
| Brand voice, tone guides | Real lab values, real chart entries |
| Glossaries, ADRs | API keys, secrets — use GitHub Secrets |
| Agent persona packs | Anything you can't sync to your laptop safely |
| Pricing rules without NDAs | Customer-specific contractual terms |

If you find yourself wanting to write a real patient record into a doc to "see what the agent does", put it in `_scratch/` and never move it out.

## Editing flow

1. Open vault in Obsidian.
2. Edit any `.md`.
3. Obsidian Git auto-commits (default every 10 min). Manual: `Cmd/Ctrl+P → Obsidian Git: Commit all changes`.
4. Push happens at the same cadence (or manually).
5. GitHub Action runs → Supabase sync → ingest → embed.
6. Agents pick up the new content on next invocation.

## Setup notes (one-time)

See `decisions/0001-obsidian-as-source-of-truth.md` for the architecture rationale and the one-time setup steps.
