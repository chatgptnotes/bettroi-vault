# Murali's Second Brain — Build Plan

**Version:** 1.0  
**Owner:** Dr. Murali (builder) + Claude Code (assistant)  
**Deadline:** 2026-05-28  
**Stack:** Next.js · Supabase · Node.js · React  
**Today:** 2026-05-17 → 11 days remaining

---

## Vision

A living knowledge system that captures everything Murali thinks, decides, and learns — across Fathom calls, Obsidian notes, Slack, paper diary, and WhatsApp — and makes it queryable by him and (with guardrails) his team, in his voice, without extra effort.

---

## Source Map

| Source | Content | Capture Mechanism | Prefix Convention |
|---|---|---|---|
| **Fathom** | Zoom call summaries | Fathom API pull (unread summaries) | Auto (Fathom includes meeting title) |
| **Obsidian vault** | Project diaries, structured notes | Already in vault pipeline (Obsidian → GitHub → Supabase) | Folder = project |
| **Slack #brain-inbox** | Paper diary photos, quick thoughts, links | Slack API, watched every 15 min | `[ProjectName] description` |
| **WhatsApp text** | Unrecorded meeting notes (Willow → WhatsApp), team messages | WhatsApp export or manual paste to #brain-inbox | `[ProjectName] meeting notes` |
| **Paper diary** | Daily to-do + per-client project pages | Photo → #brain-inbox with prefix | `[ProjectName] diary YYYY-MM-DD` |
| **Claude Code history** | Decision sessions, architecture thinking | One-time export + ongoing session saves | N/A |

**Routing rule:** Every ingest item is filed to the Obsidian project folder whose name matches the prefix tag. `[AdamritHMS]` → `Adamrit/` folder. Untagged items go to `_inbox/` for manual review.

---

## Output Modes

### B — Ask-Anything Slack Bot
DM `@brain` in Slack: *"What did I decide about AdamritHMS pricing last month?"*  
Brain searches vault + Fathom summaries + ingested items for that project, returns answer with source citations (file name + date).

### C — Proactive Morning Digest
Every morning at 07:30 IST, brain reads today's to-do list (from `#brain-inbox` daily prefix or Obsidian daily note), identifies active projects, and posts a digest to your DM:
> *"You have 3 items on AdamritHMS today. Last Fathom call (May 14): decision on billing module delayed. Your diary entry (May 15): follow up with dev team. Relevant context: [link]"*

### D — Teachable Twin (Role-Based Access)
Team members query the brain in a Slack channel. Brain answers in Murali's voice with guardrails.

---

## Architecture

```
Sources
  Fathom API ─────────────────────┐
  Obsidian/GitHub ─────────────── │──→ Ingest Worker (Node.js)
  Slack #brain-inbox ─────────── │       ↓
  WhatsApp (manual paste) ───────┘   Chunk + Embed
                                      (OpenAI text-embedding-3-small)
                                          ↓
                                   Supabase pgvector
                                   (table: brain_chunks)
                                          ↓
                              ┌────────────────────┐
                              │   Query Engine     │
                              │  vector search +   │
                              │  project filter    │
                              └────────────────────┘
                                          ↓
                              Slack Bot (Next.js API route)
                              ├── /api/brain/query   (B)
                              ├── /api/brain/digest  (C, cron)
                              └── /api/brain/team    (D, role-gated)
```

**Storage schema (Supabase):**
```sql
brain_chunks (
  id uuid,
  project_tag text,          -- "AdamritHMS", "Hope", "_inbox"
  source_type text,          -- "fathom", "obsidian", "slack", "diary"
  source_ref text,           -- file path or URL
  content text,
  embedding vector(1536),
  metadata jsonb,            -- {date, off_limits: false, tags: []}
  created_at timestamptz
)

brain_access_roles (
  role text,                 -- "coo", "sales_lead", "murali"
  allowed_projects text[],   -- ["*"] = all
  blocked_tags text[]        -- ["hr", "salary", "accounts", "private"]
)
```

---

## Build Schedule (11 days)

### Days 1–2 · May 17–18 · Foundation
**Goal:** Supabase schema live, first chunks inserted, embeddings working.

- [ ] Create `brain_chunks` and `brain_access_roles` tables in Supabase
- [ ] Enable pgvector extension (`create extension vector`)
- [ ] Write `ingest.js` — takes `{text, project_tag, source_type, source_ref}`, chunks, embeds via OpenAI, inserts to Supabase
- [ ] Test: manually insert one Fathom summary, verify embedding stored
- [ ] Create `#brain-inbox` channel in Slack

**Claude Code prompt to use:**
> "Create a Node.js ingest function that takes text content, splits it into 512-token chunks with 50-token overlap, embeds each chunk using OpenAI text-embedding-3-small, and inserts into a Supabase table called brain_chunks with columns: project_tag, source_type, source_ref, content, embedding, metadata."

---

### Days 3–4 · May 19–20 · Connectors
**Goal:** Fathom and Obsidian auto-feed into brain.

**Fathom connector:**
- [ ] Fathom API key → env var `FATHOM_API_KEY`
- [ ] `fathom-sync.js` — fetch all summaries since last sync date, ingest each, store last-sync timestamp in Supabase `brain_sync_state`
- [ ] Run once manually to backfill all unread summaries
- [ ] Schedule via Vercel cron: every 6 hours

**Claude Code prompt:**
> "Write a Node.js script that calls the Fathom API to list all meeting summaries, filters for those newer than a stored last_sync timestamp, and passes each summary's transcript/summary text to the ingest function. Store the new last_sync timestamp after each run."

**Obsidian connector:**
- [ ] Vault already syncs to GitHub repo (`bettroi-vault`)
- [ ] `obsidian-sync.js` — walk all `.md` files, check last modified vs last-sync, ingest changed files with `project_tag` = parent folder name
- [ ] Run via Vercel cron: every 30 min (mirrors vault sync cadence)

---

### Days 5–6 · May 21–22 · Phase B — Slack Bot (Ask-Anything)
**Goal:** `@brain` DM in Slack returns answers with citations.

- [ ] Slack app setup: create app, enable Socket Mode or Events API, add Bot Token to env
- [ ] `query.js` — takes question + user role, runs pgvector similarity search filtered by `project_tag` whitelist for that role, returns top 5 chunks
- [ ] LLM synthesis: pass chunks + question to Claude Sonnet, prompt: *"Answer based only on these sources. Cite each source by date and type. If answer not found, say so."*
- [ ] Slack bot handler: on DM mention → call query → post response with source list
- [ ] Deploy to Vercel

**Claude Code prompt:**
> "Write a Next.js API route /api/brain/query that accepts {question, user_role}. It fetches the allowed_projects for that role from brain_access_roles, runs a pgvector similarity search on brain_chunks filtered to those projects, takes the top 5 results, and calls Claude Sonnet to synthesize an answer with citations. Return the answer and an array of source references."

**Test:** DM @brain — *"What did I decide about AdamritHMS billing?"* → should return answer from Fathom summary.

---

### Days 7–8 · May 23–24 · Phase B continued + #brain-inbox Processing
**Goal:** Slack #brain-inbox fully wired — photos OCR'd, prefixes parsed, routed.

- [ ] Slack event listener: watch `#brain-inbox` for new messages
- [ ] Prefix parser: extract `[ProjectName]` from message text, default to `_inbox` if none
- [ ] Text messages: ingest directly
- [ ] Image attachments: download → Claude Vision API for OCR → ingest extracted text
- [ ] Post confirmation to `#brain-inbox`: *"Filed [AdamritHMS diary 2026-05-23] → AdamritHMS folder ✅"*

**Claude Code prompt:**
> "Write a Slack event handler that triggers on new messages in #brain-inbox. Parse [ProjectName] prefix from message text. If message has image attachments, download them and send to Claude Vision to extract text. Then call the ingest function with the extracted text, project_tag from the prefix, source_type 'slack', and source_ref as the Slack message permalink."

---

### Days 9–10 · May 25–26 · Phase C — Morning Digest
**Goal:** 07:30 IST digest posted to Murali's Slack DM daily.

- [ ] Vercel cron job: `0 2 * * *` UTC (= 07:30 IST)
- [ ] `digest.js` — reads today's to-do (from `#brain-inbox` message tagged `[todo YYYY-MM-DD]` or Obsidian daily note)
- [ ] Extracts project names from to-do items
- [ ] For each project: query brain for last 7 days of content, summarize key points
- [ ] Format digest and DM to Murali's Slack user ID

**Claude Code prompt:**
> "Write a Node.js digest generator that takes a list of project names, queries brain_chunks for each (filtered to last 7 days, ordered by created_at desc, limit 10 per project), calls Claude Sonnet to summarize what's relevant for today, and formats a Slack Block Kit message with one section per project showing key context and source links."

---

### Day 11 · May 27–28 · Phase D — Teachable Twin + Access Control
**Goal:** COO and Sales Lead can query brain from a team Slack channel with guardrails.

- [ ] Create `#ask-brain` Slack channel
- [ ] Map Slack user IDs to roles in `brain_access_roles`
- [ ] Bot detects query in `#ask-brain`, looks up sender's role, applies project filter + blocked tag filter
- [ ] Off-limits check: if query contains keywords (salary, HR, accounts, payment, invoice) → bot replies *"That topic is outside what I can share. Ask Murali directly."*
- [ ] Add `[Private]` tag support: any chunk with `off_limits: true` in metadata is excluded from all team queries
- [ ] Confidence score: append *"Confidence: High / Medium — verify with Murali for decisions"* to every team-facing answer

**Access rules (hard-coded in `brain_access_roles`):**

| Role | Allowed projects | Blocked topics |
|---|---|---|
| murali | `["*"]` | none |
| coo | `["*"]` | hr, salary, accounts, payments, private |
| sales_lead | client-facing projects only | hr, salary, accounts, payments, private, internal |

---

## Off-Limits Enforcement

Two layers:
1. **Query-time keyword filter** — if question matches blocked keywords, refuse before searching
2. **Chunk-level metadata flag** — `off_limits: true` on any chunk tagged `[Private]`, HR, salary, or accounts content; excluded from all non-Murali queries via SQL `WHERE metadata->>'off_limits' = 'false'`

Any Obsidian note in a folder named `_private`, `HR`, `Accounts`, or `Finance` is automatically ingested with `off_limits: true`.

---

## Environment Variables Required

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=           # for embeddings (text-embedding-3-small)
ANTHROPIC_API_KEY=        # for synthesis (Claude Sonnet) and OCR (Claude Vision)
FATHOM_API_KEY=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_BRAIN_INBOX_CHANNEL_ID=
SLACK_MURALI_USER_ID=
```

---

## Cost Estimate (Monthly, steady-state)

| Item | Cost |
|---|---|
| OpenAI embeddings (text-embedding-3-small, ~500K tokens/month) | ~$0.10 |
| Claude Sonnet queries (~200 queries/month × ~2K tokens each) | ~$3.00 |
| Claude Vision OCR (~30 diary photos/month) | ~$0.60 |
| Supabase Pro (pgvector, storage) | $25.00 |
| Vercel (existing) | $0 (existing plan) |
| **Total** | **~$29/month** |

---

## Definition of Done

- [ ] **Phase B:** DM @brain a question about any ingested project → answer with cited source within 10 seconds
- [ ] **Phase C:** Morning digest arrives at 07:30 IST with accurate project context
- [ ] **Phase D:** COO queries `#ask-brain` → gets answer; COO asks about salary → gets refused
- [ ] **Off-limits:** `[Private]` tagged content never surfaces in team queries
- [ ] **Routing:** `[AdamritHMS]` prefixed diary photo → filed under AdamritHMS project folder, confirmation posted in #brain-inbox

---

## Daily Ritual (once built)

| Time | Action | Time cost |
|---|---|---|
| Morning | Photograph diary page → drop in #brain-inbox with `[ProjectName] diary YYYY-MM-DD` | 30 sec |
| Morning | Brain digest arrives at 07:30 in Slack DM | 0 sec |
| Anytime | DM @brain any question | 5 sec |
| After unrecorded meeting | Paste Willow transcript into #brain-inbox with `[ProjectName] meeting notes` | 30 sec |

**Total daily effort: ~1 minute.**

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Fathom API not public / rate-limited | Fall back to Fathom Notion/Slack export as intermediate source |
| Paper diary photo OCR misread | Confirmation message in #brain-inbox — you see what was filed |
| Wrong project routing (prefix typo) | `_inbox` catch-all + weekly "unfiled items" Slack reminder |
| D answers team with wrong info | Confidence score + "verify with Murali" footer on every team reply |
| 11-day timeline slips | D is the only droppable phase — B+C alone is a complete, usable brain |

---

*Generated: 2026-05-17 | Next review: 2026-05-28 (post-build retrospective)*
