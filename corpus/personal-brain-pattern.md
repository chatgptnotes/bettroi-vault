---
department: general
agent_pack: personal-brain
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [pattern, second-brain, wiki, crm, journal, obsidian, automation]
---

# Personal Brain — Wiki + CRM + Journal Pattern

> Source: Matt Wolfe's "AI-powered second brain" video (youtube.com/watch?v=yke4fLQUsh4). Adapted here as a reference architecture clients can layer onto the Bettroi vault model. Distinct from the *Business Brain* (which holds company SOPs); this is the *Personal Brain* (individual knowledge worker pattern).

## Three pillars

```
┌──────────────────────────────────────────────────────────────┐
│  raw/      → Web clipper drops here (articles, transcripts)  │
└────┬─────────────────────────────────────────────────────────┘
     │  hourly automation: AI summarises + extracts entities
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  wiki/   │◀──▶│   crm/   │    │ journal/ │
│ topics   │    │  people  │    │  daily   │
└──────────┘    └──────────┘    └──────────┘
     ▲                                │
     └────── AI grounds journal ──────┘
            replies on wiki + crm
```

| Pillar | What lives here | Who writes |
|---|---|---|
| `wiki/` | Topic pages, summaries of clipped content, interlinked notes | AI (from `raw/`) + human edits |
| `crm/` | One file per person — contact details, conversation log, meeting notes | AI (extracts mentions) + human |
| `journal/` | Daily / weekly entries with AI feedback grounded in wiki + crm | Human writes; AI responds |
| `raw/` | Inbox for the Obsidian Web Clipper — articles, YouTube transcripts, PDFs | Web Clipper writes; AI consumes + deletes |

---

## Folder layout (when adopted)

```
personal-brain/
├── raw/                ← Obsidian Web Clipper output (transient)
├── wiki/
│   ├── topics/         ← One file per concept
│   ├── tools/          ← One file per tool/SaaS encountered
│   └── companies/      ← One file per company encountered
├── crm/
│   └── people/         ← <name>.md per contact
├── journal/
│   └── 2026/05/        ← YYYY/MM/DD.md
└── agents.md           ← Codex-style automation instructions
```

---

## Templates

### Wiki entry — `wiki/topics/<slug>.md`

```markdown
---
type: wiki
topic: <slug>
sources: [<raw-file-1>, <raw-file-2>]
last_updated: YYYY-MM-DD
---

# <Topic name>

## What it is
<1-2 sentence definition>

## Why it matters
<context — why I care, who else cares>

## Key facts
- <bullet> [^1]
- <bullet> [^2]

## Related
- [[<other-topic>]]
- [[crm/people/<person>]] mentioned this on [[journal/2026/05/10]]

## Sources
[^1]: <raw/2026-05-08-some-article.md>
[^2]: <raw/2026-05-09-yt-transcript.md>
```

### CRM contact — `crm/people/<name>.md`

```markdown
---
type: crm
name: <First Last>
company: <company>
role: <title>
email: <email>
linkedin: <url>
last_contact: YYYY-MM-DD
status: active | dormant | lost
---

# <First Last>

## Context
<how I met them, mutual connections, why they matter>

## Conversations
- **2026-05-10** — discussed [[wiki/topics/ai-first-framework]]. Action: send Discovery Sprint quote.
- **2026-04-22** — first call via [[crm/people/intro-source]].

## Notes
<freeform>

## Mentions in journal
<auto-populated by AI>
```

### Journal entry — `journal/2026/05/10.md`

```markdown
---
type: journal
date: 2026-05-10
mood: <optional>
---

# 2026-05-10

## What happened
<freeform>

## Decisions made
- <decision> → also added to [[decisions/]] if architectural

## Open questions
<questions for AI to address tomorrow>

---

## AI feedback
<populated by automation — pulls from wiki + crm to ground reply>
```

---

## `agents.md` — automation instructions (Codex-style)

```markdown
# Personal Brain — Agent Instructions

You are the maintainer of this vault. Run hourly. Your job:

## On every new file in `raw/`:
1. Read the file. Detect content type (article / YouTube transcript / PDF / podcast).
2. Generate a **summary** (3–5 bullets) at the top of the file.
3. Extract **entities**:
   - People → check if `crm/people/<name>.md` exists. If yes, append a `Mentions` link. If no, draft a new file with placeholder fields and tag `status: needs-review`.
   - Companies → upsert `wiki/companies/<slug>.md`.
   - Concepts/topics → upsert `wiki/topics/<slug>.md`. Include source backlink as footnote.
   - Tools mentioned → upsert `wiki/tools/<slug>.md`.
4. Once processed, **move** the raw file to `raw/_processed/YYYY-MM-DD/` (don't delete — provenance).

## On every new journal entry:
1. Read today's `journal/YYYY/MM/DD.md`.
2. Identify topics mentioned (people, decisions, questions).
3. Pull related context from `wiki/` and `crm/`.
4. Append an **AI feedback** section at the bottom with grounded responses (quote sources via wikilinks).
5. Surface 1–3 follow-up questions or actions.

## Hard rules
- Never modify the user's hand-written sections of journal entries.
- Never delete from `crm/` — only append to the conversation log.
- Always add `[[wikilinks]]` between related entities.
- If unsure about an entity match (e.g. two "John Smith" candidates), add `status: needs-review` and stop — don't guess.

## Sync
After every run, commit changes with message `personal-brain: hourly sync YYYY-MM-DD HH:00`. Push to GitHub.
```

---

## How to wire it (Obsidian + Codex/Claude Code + GitHub)

1. **Install the [Obsidian Web Clipper](https://obsidian.md/clipper)** browser extension. Configure default destination: `personal-brain/raw/`.
2. **Add this folder to the existing vault** (so Obsidian Git already covers it).
3. **Run the agent**: schedule a Claude Code session (or any AI runner) hourly via cron / GitHub Actions / Codex automation. Point it at this folder; load `agents.md` as the system prompt.
4. **Review output daily** — the AI should be ~90% right; the journal "AI feedback" section is where you catch hallucinations.

---

## How this complements the Business Brain

| | Business Brain (this vault's primary purpose) | Personal Brain (this pattern) |
|---|---|---|
| Owner | Company / tenant | Individual |
| Content | SOPs, agent packs, ADRs, glossaries | Clipped articles, contacts, journal |
| Mutability | Human-curated; AI reads only | AI co-authors; human edits |
| Audience | Production AI agents | One person + their AI assistant |
| Sync cadence | 10-min Obsidian Git → Supabase | Hourly Codex/Claude Code agent |
| Lives in | `agents/`, `corpus/`, `decisions/` | `personal-brain/` (separate top-level) |

Both can coexist in the same vault. Both are Markdown. Both sync to GitHub. The Personal Brain is **opt-in** — most clients adopt only the Business Brain. Power users (founders, AI Champions) add the Personal Brain later as a productivity multiplier.

---

## Why this is in `corpus/` and not as an active vault

Hope Hospital's tenant is a *Business Brain* deployment, not a personal brain. This file is the **reference architecture** so HopeTech engineers can stand up the Personal Brain pattern for clients who want it (e.g., the founder's individual layer).

If/when a client adopts this for real, create a `personal-brain/` top-level folder in *their* vault (not this one) and point them at this file as the playbook.
