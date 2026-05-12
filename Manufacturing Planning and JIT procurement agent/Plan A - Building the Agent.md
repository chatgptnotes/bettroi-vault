# Plan A — Building the Manufacturing Production Scheduling + JIT Procurement Agent

> **Reading order:** [[Primer]] → **Plan A** (this) → [[Plan B - Data Sourcing]]. Start at [[Home]].
>
> **Status (2026-05-12, session 2):** Phase 3 now requires multi-level BOM (see [[Multi-Level BOM]] + [[Shared WIPs]]). Phase 4 now describes the full MPS-MRP-daily integrated loop (see [[Master Production Schedule]]). Phase 5b ([[Chat Sidecar]]) added in parallel with Phase 5.

## Context

You want a **locally-deployed, advisory AI agent** for a manufacturing company that:

1. Generates production schedules and JIT purchase-order recommendations.
2. Reads its rulebook from a **human-curated [[Skills Vault]]** (Obsidian, git-tracked `.md` files).
3. Writes its own experience to a **separate [[Memory Vault]]** (also Obsidian + git).
4. **Learns from planner corrections** — every override becomes a permanent training signal via the [[Correction Loop]].
5. Starts **generic**, then verticalizes per industry — see [[Generic vs Vertical]].

**Confirmed decisions from clarification:**

| Question | Decision |
|---|---|
| LLM backend | **Hybrid** — see [[Hybrid LLM Routing]] |
| Domain | **Generic core first**, vertical strategy modules later |
| Authority | **Advisory only** — planner approves every action |
| Connectors | ERP (SAP, Tally), Excel/Sheets, MES/SCADA — file-drop first, real APIs later |
| Learning | Episodic memory + reflection + user-correction-as-signal — see [[Cyclic RAG]] |
| Vault | **Two vaults**: [[Skills Vault]] (RO) + [[Memory Vault]] (RW) |

The user-correction-as-signal is the central design pin. The planner overriding the agent is treated as ground truth — the system captures the **delta** (what agent said, what planner did, why) and embeds it into retrievable lessons.

---

## Recommended Architecture

```
                              ┌──────────────────────────────────┐
                              │       Obsidian (planner UI)      │
                              │  - browses skills + memory       │
                              │  - edits skills directly         │
                              └─────────────┬────────────────────┘
                                            │ git pull/push
        ┌───────────────────────────────────┼────────────────────────────────────┐
        │ skills-vault/  (RO to agent)      │   memory-vault/  (RW by agent)     │
        │  ├── 00-core/                     │    ├── episodes/YYYY/MM/DD/        │
        │  ├── 10-scheduling/               │    │     2026-05-12T14-03_wo4471.md│
        │  ├── 20-procurement-jit/          │    ├── corrections/                │
        │  ├── 30-domain/discrete/          │    │     2026-05-12_planner-XYZ.md │
        │  ├── 30-domain/batch/             │    └── lessons/                    │
        │  └── 30-domain/process/           │          changeover-bias.md ...    │
        └───────────────────────────────────┴────────────────────────────────────┘
                                            │
                                            │  file watcher → embed
                                            ▼
                              ┌──────────────────────────────────┐
                              │ Vector store (Chroma, on-disk)   │
                              │  collections: skills, episodes,  │
                              │  corrections, lessons            │
                              └─────────────┬────────────────────┘
                                            │
                ┌───────────────────────────┴──────────────────────────────┐
                │                  Agent core (LangGraph)                  │
                │  ingest → retrieve → reason → recommend → await-approval │
                │                  └─── model-router ───┐                  │
                │                       Ollama (Qwen2.5/Llama3.1) routine  │
                │                       Claude API     hard reasoning      │
                └─────────┬────────────────────────────────────┬───────────┘
                          │                                    │
                          ▼                                    ▼
              ┌────────────────────┐                  ┌──────────────────────┐
              │ Connector layer    │                  │ Web approval UI      │
              │  ExcelAdapter      │                  │  shows recommendation│
              │  TallyAdapter      │                  │  planner edits/      │
              │  SAPAdapter        │                  │  approves            │
              │  MESAdapter (your  │                  │  captures rationale  │
              │   Modbus/OPC stack)│                  │  → writes episode    │
              └────────────────────┘                  └──────────────────────┘
```

---

## Build Order (dependency-bottom-up, ship something usable end of each phase)

### Phase 1 — Vault foundation (Days 1–4)

**Goal:** A planner can sit in Obsidian and read/edit skills; agent can read them programmatically.

- Create two repos: `mfg-agent-skills` and `mfg-agent-memory`. Both Obsidian vaults, both git-tracked, separate remotes.
- Seed [[Skills Vault]] with the bootstrap structure:
  - `00-core/` — `agent-charter.md`, `safety-rules.md`, `decision-checklist.md`
  - `10-scheduling/` — `priority-rules.md`, `bottleneck-handling.md`, `changeover-rules.md`
  - `20-procurement-jit/` — `reorder-logic.md`, `supplier-lead-times.md`, `kanban-rules.md`, `safety-stock.md`
  - `30-domain/discrete|batch|process/` — empty placeholders, filled per customer
  - `40-templates/` — [[Episode]], [[Correction Note]], [[Lesson]] templates with YAML frontmatter
- Frontmatter schema (every skill `.md`): `id`, `domain`, `priority`, `applies_to`, `last_reviewed`, `version`
- Reuse the pattern from `~/.claude/skills/` — your skill discovery loader works on `SKILL.md` with frontmatter; mirror that.

**Verification:** `python -m mfg_agent.vault list-skills --vault skills-vault` prints every skill with its frontmatter. Planner can edit a `.md` file in Obsidian, `git diff` shows the change.

### Phase 2 — Embedding + retrieval pipeline (Days 5–8)

**Goal:** Agent can retrieve the right skill/memory chunks for a given query.

- **Vector store:** Chroma (on-disk, single-file, no server needed) — survives restarts, easy to backup, can switch to Qdrant later if scale demands.
- **Embedder:** local first — `nomic-embed-text` via Ollama (768-dim, fast on CPU). Keeps embeddings inside the plant.
- **File watcher:** `watchdog` library — on `.md` change in either vault, re-embed that file's chunks. Chunk by H2 headings (typical Obsidian structure).
- **Collections:** `skills`, `episodes`, `corrections`, `lessons` — separate so retrieval can be **weighted** (a correction outranks a skill outranks a stale episode).
- **Timestamp filtering:** every chunk carries `created_at`, `last_seen_at`. Retrieval supports time-windowed queries — see [[Cyclic RAG]].
- **Cyclic refresh:** nightly job re-embeds anything whose `last_reviewed` frontmatter is older than N days, surfaces stale skills to the planner for review.

**Verification:** Drop a new `changeover-rules.md`, watcher picks it up within 2s, `agent.retrieve("how to handle paint line changeover")` returns it ranked first.

### Phase 3 — Connector layer + canonical data model (Days 9–14)

**Goal:** Agent reads real factory data through one interface, regardless of source.

- **Canonical schema** (Pydantic models): `Item`, `BOMEdge`, `Operation`, `RoutingGraph`, `WorkOrder`, `InventoryLevel`, `Supplier`, `MachineState`, `DemandSignal`. Source-agnostic. This is the contract every adapter implements.

- **Multi-level BOM is non-negotiable** — see [[Multi-Level BOM]]. The `Item` + `BOMEdge` pair forms a DAG, not a flat per-product list. This is what enables [[Shared WIPs]] handling. Customers without multi-level BOMs in their ERP must author the structure in Excel during Bronze-tier onboarding (most Indian SMBs).

- **Routing as a graph, not a list** — operations belong to **items** (intermediate or final), not to final products. The agent computes a topological sort at startup; scheduling walks the routing DAG bottom-up.

- **Two indexes** computed at startup and cached:
  - `where_used[item]` → downstream items that consume this one
  - `where_made[item]` → operations that produce this one

- **Cycle detection** — Kahn's algorithm at startup; refuse to start on a cyclic BOM, surface the cycle path to IT.
- **Adapter interface** (mirror your `ProtocolAdapter` pattern from `gridvision-scada/apps/server/src/protocol/`):

  ```python
  class DataAdapter(Protocol):
      def fetch_work_orders(self, window: TimeRange) -> list[WorkOrder]: ...
      def fetch_inventory(self) -> list[InventoryLevel]: ...
      def fetch_machine_states(self) -> list[MachineState]: ...
  ```

- **Implementations, in order:**
  1. `ExcelAdapter` — watches a shared folder, reads `.xlsx` with documented columns. Ships in week 2. **Most Indian SMBs start here.**
  2. `MESAdapter` — wraps your existing `IEC61850Adapter` / `ModbusAdapter` from gridvision-scada. Reuse, don't rewrite.
  3. `TallyAdapter` — Tally XML-over-HTTP (port 9000). Many Indian customers run this.
  4. `SAPAdapter` — OData / BAPI. Last because slowest customer-side setup.
- **Mock adapter for dev:** `SyntheticFactoryAdapter` generates a fake discrete-assembly plant (50 work orders, 200 SKUs, 5 work centers) for local testing.

**Verification:** `agent ingest --adapter excel --path ./sample-data/` loads a real spreadsheet into the canonical model. Round-trip test: synthetic adapter → canonical → agent → recommendation.

### Phase 4 — Agent core + model router (Days 15–22)

**Goal:** End-to-end recommendation flow that runs [[Master Production Schedule|MPS, MRP, and daily scheduling]] as one integrated loop.

- **Framework:** **LangGraph** (Python). Reasons:
  - Explicit state machine — auditable, exactly what advisory mode needs.
  - First-class checkpointing — every step is replayable.
  - Plays nicely with both Ollama and Claude API.
  - Better than CrewAI for deterministic flows; better than Claude Agent SDK here because you need local-model paths.

- **The daily loop** (this is the full pipeline — each step is a LangGraph node or sub-node):

  ```
  1.  INGEST          : pull WOs, demand, inventory, machine states (adapters)
  2.  BACKWARD-SCHEDULE: for each final-product WO, compute latest-start
                        at every operation back to raw material
  3.  EXPLODE         : multi-level BOM-explode → aggregate demand at
                        every item (including shared WIPs) by time bucket
  4.  NET             : subtract on-hand + on-order + planned production
                        at every level of the BOM tree
  5.  RETRIEVE        : skills + lessons per scheduling decision point
  6.  LOT-SIZE        : at each shared step, apply active lot-sizing skill
                        (pull / campaign / hybrid) to decide batch start dates
  7.  FORWARD-SCHEDULE: simulate execution forward; identify capacity
                        conflicts and orders projected to slip
  8.  ALLOCATE        : if shared-step output < demand, run allocation
                        algorithm driven by skills + active lessons
  9.  JIT-TRIGGER     : for every raw material in the BOM tree, compute
                        lesson-adjusted ROP and recommend POs
  10. DAILY-DISPATCH  : today + tomorrow's section of MPS → sequence
                        operations per work center (changeover skill)
  11. PEG             : link every recommendation to upstream supply
  12. PRESENT         : MPS dashboard + daily schedule + citations
  13. AWAIT           : planner approves / edits
  14. RECORD          : write [[Episode]] + [[Correction Note]] (if edit)
  15. RE-PEG          : if planner overrode, recompute pegging — surface
                        upstream over/under-production consequences
  ```

- **Critical sub-steps are skill-driven, not hardcoded:**
  - **Lot-sizing (step 6):** the customer's per-WIP `lot-sizing.md` skill decides pull vs campaign vs hybrid.
  - **Allocation (step 8):** the `shared-wip-allocation-priority.md` skill ranks downstream consumers; lessons refine over time.
  - **Lead-time adjustment (step 9):** active [[Lesson|lessons]] like "Supplier A +4 days in monsoon" mutate the ROP math.

- **Worked example reference:** see [[Master Production Schedule]] for the full P1/P2/P3 with shared WIP-5 walkthrough — internalize that before coding Phase 4.

- **Model router heuristics** — see [[Hybrid LLM Routing]] for full details.

- **Citation-first prompting:** the agent **must** name the skill IDs and episode IDs that informed each recommendation. Uncited recommendations get rejected by a post-check. This makes corrections trainable later.

**Verification:**
- Synthetic factory + 10 hand-written skills → agent produces a recommendation that cites at least 2 skill IDs.
- Run the [[Master Production Schedule|worked example]] (3 orders, shared WIP-5) end-to-end. Confirm aggregated WIP-5 demand at Day 14 = 300, at Day 22 = 1,300. Confirm raw-material PO advised on Day 3 and Day 11.
- Disconnect the API, confirm Ollama path still works for routine queries.

### Phase 5 — Approval UI + correction capture (Days 23–28)

**Goal:** The [[Correction Loop]] closes. This is the highest-value phase.

- **UI:** Next.js + Tailwind, single page. Three panes:
  - **Left:** the agent's recommendation, with citations as clickable Obsidian links.
  - **Middle:** the underlying data the agent used (work orders, inventory).
  - **Right:** planner action — Approve / Edit / Reject — with a **mandatory "why" field** when edited or rejected.
- **Correction capture flow:**
  1. Planner edits the recommendation. UI diffs original vs edited.
  2. Planner writes the reason (or picks from a tag list: `wrong-priority`, `supplier-unreliable`, `customer-VIP`, `machine-down`, etc.).
  3. Agent writes a **[[Correction Note]]** to `memory-vault/corrections/`.
  4. Watcher embeds it. Next retrieval involving the same pattern picks it up.

- **[[Episode]] note** (every decision, approved or not) goes to `memory-vault/episodes/YYYY/MM/DD/`. Includes input snapshot, recommendation, planner action, and outcome (filled in later when actual delivery/production data arrives).

**Verification:** Run agent → planner edits → check `memory-vault` has new correction file → re-run same scenario → agent's new recommendation cites the correction note and changes behavior.

### Phase 5b — Chat sidecar (Days 26–28, parallel with Phase 5)

**Goal:** A read-only conversational companion to the structured approval UI. The planner can **ask about** decisions; they cannot **make** decisions through chat. See [[Chat Sidecar]] for the full archetype catalog.

**Why both UIs:**

| Need | Structured UI | Chat sidecar |
|---|---|---|
| Place a PO / approve a schedule | ✅ Mandatory | ❌ Forbidden |
| Capture planner reasoning for [[Correction Loop]] | ✅ Form fields | ❌ Too unstructured |
| Audit trail with citations | ✅ Built-in | △ Logged but secondary |
| "Why did you pick Supplier B?" | △ Citations visible but terse | ✅ Best fit |
| "Show me lessons about Mahindra" | ❌ Awkward | ✅ Natural |
| "What's our exposure to Supplier A this month?" | ❌ No such screen | ✅ Analytical Q&A |
| Onboarding a new planner | △ Limited | ✅ "Explain what you'd do" |

**The 8 archetypes** (one per [[Cyclic RAG]] operation) — see [[Chat Sidecar]]:
1. **Retrieval Detective** — makes RAG transparent
2. **Vault Gardener** — keeps the RAG from rotting
3. **Lesson Curator** — human-in-the-loop for [[Lesson]] promotions
4. **Pattern Spotter** — real-time reflection (faster than nightly batch)
5. **Historian** — leverages timestamped [[Episode|episodes]]
6. **Skill Author** — extends the playbook conversationally
7. **Counterfactual Player** — debugs RAG composition
8. **Onboarding Coach** — knowledge-transfer for new planners

**Hard boundaries (P0 invariants, not nice-to-haves):**

1. Chat cannot write [[Episode|episodes]] or [[Correction Note|corrections]] — memory-vault writes only happen via the structured approval UI.
2. Chat cannot place POs or release work orders — "yes do that" deep-links into the structured approval queue.
3. Chat answers must cite — every factual claim grounded in a `skill_id`, `lesson_id`, or `episode_id`. Uncited assertions are post-checked and rejected.
4. Chat uses the [[Hybrid LLM Routing|model router]] like everything else.
5. Chat history goes to `memory-vault/conversations/` with 30-day retention.
6. No multi-turn agentic chains — single retrieval + single response per turn.

**Implementation:** same FastAPI backend, same Next.js UI shell. New tab **"Ask"** alongside **"Approve"** and **"Lessons to review"**. LangGraph gains a parallel entry node: `chat_query` → `retrieve_skills+memory` → `route_model` → `respond_with_citations`. Reuses the decision-flow retrieval and routing nodes.

**Verification:**
- 20 mixed questions (Q&A, vault search, what-if) — all responses cite ≥1 skill/lesson/episode.
- Try to issue a decision in chat → confirm refusal + deep-link to structured flow.
- Disconnect API → routine Q&A works on Ollama; complex synthesis queues.
- No corrections/episodes written from chat traffic — verify via `memory-vault/` git diff.

---

### Phase 6 — Reflection loop (Days 29–35)

**Goal:** Patterns across corrections become promoted **[[Lesson|lessons]]** in `lessons/`.

- **Nightly cron job** (`reflection_worker.py`):
  1. Reads last 7/30/90-day correction notes.
  2. Clusters by tags + embedding similarity (HDBSCAN or k-means on embeddings).
  3. For each cluster with N≥3 corrections, sends the cluster to **Claude Sonnet** with a "synthesize a lesson" prompt.
  4. Writes a draft `memory-vault/lessons/<topic>.md` with `status: draft`.
  5. Surfaces drafts in the approval UI's "Lessons to review" tab.
  6. Planner promotes draft → `status: active` (or rejects). Active lessons get higher retrieval weight than raw episodes.

- **Outcome ingestion:** when actual production / delivery data lands (next day's MES feed, GRN entry), `update_episode_outcomes` job back-fills episodes with `outcome: on_time | late | failed` so reflection has ground truth, not just planner opinion.

- **Anti-drift guardrail:** every active lesson has a `confidence_decay` — if it hasn't been retrieved/applied in 90 days, demote to `dormant`. Prevents lesson rot.

**Verification:** Seed 5 supplier-related corrections, run reflection, get a draft `supplier-monsoon-reliability.md` lesson. Planner approves it. New recommendations cite the lesson, not the individual corrections.

### Phase 7 — Vertical specialization hooks (Days 36+, per customer)

**Goal:** Generic core; per-customer overlay. See [[Generic vs Vertical]].

- `skills-vault/30-domain/discrete/` etc. populated per deployment.
- **Strategy plug-in interface:** `SchedulingStrategy` ABC with `discrete_dispatching`, `batch_campaign`, `process_continuous` implementations. The generic core calls `strategy.rank_work_orders()`; the strategy reads from the domain skills folder.
- Per-customer config in `deployment.yaml`: which adapters, which strategy, which model router thresholds.

---

## Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Language | **Python 3.12** | Matches your existing `plc-migration-tool` stack; rich data libraries. |
| Agent framework | **LangGraph** | Explicit state, checkpointing, hybrid-model friendly. |
| Local LLM | **Ollama** (Qwen2.5-7B + nomic-embed-text) | One-binary install, plant-friendly. |
| API LLM | **Claude Sonnet 4.6 + Haiku 4.5** | Best reasoning; Haiku for cheap routing classification. |
| Vector DB | **Chroma** (on-disk) | Zero-ops, single file, swap to Qdrant later. |
| Vault format | **Obsidian + git** | You already use it; planner-friendly. |
| Connectors | **Pydantic adapter pattern** | Same shape as `gridvision-scada`'s `ProtocolAdapter`. |
| UI | **Next.js 14 + Tailwind** | Familiar from your gridvision stack. |
| Process orchestration | **APScheduler** (in-proc) or **Celery + Redis** if you want to share with plc-migration-tool | Nightly reflection + outcome backfill. |
| Deployment | **Docker Compose** — agent, Ollama, Chroma volume, UI, Redis | On-prem single-box install. |

---

## Files / Directories to Create

```
mfg-agent/                           ← new repo, sibling to your existing projects
├── README.md
├── CLAUDE.md                        ← per-project instructions (mirror existing pattern)
├── docker-compose.yml
├── pyproject.toml
├── src/mfg_agent/
│   ├── vault/                       ← skills/memory I/O, watcher, embedder
│   ├── adapters/                    ← Excel, Tally, SAP, MES, synthetic
│   ├── graph/                       ← LangGraph nodes
│   ├── router/                      ← model router (Ollama vs Claude)
│   ├── memory/                      ← Chroma client, episode/correction/lesson writers
│   ├── reflection/                  ← nightly cluster + synthesize worker
│   └── api/                         ← FastAPI for the Next.js UI
├── ui/                              ← Next.js 14 approval UI
└── sample-data/                     ← synthetic factory dataset

mfg-agent-skills/                    ← separate repo, Obsidian vault, RO to agent
mfg-agent-memory/                    ← separate repo, Obsidian vault, RW by agent
```

---

## Patterns to Reuse from Your Existing Codebase

- **`gridvision-scada/apps/server/src/protocol/`** — `ProtocolAdapter` interface is the exact shape for `DataAdapter`. Lift the abstract class pattern directly.
- **`gridvision-scada` MES connectors** (`IEC61850Adapter`, `ModbusAdapter`) — wrap them as `MESAdapter` rather than rewriting protocol code.
- **`~/.claude/skills/<skill>/SKILL.md` frontmatter convention** — adopt it 1:1 for skill vault files. Discovery code mirrors your existing skill loader.
- **`plc-migration-tool/backend`** (Django + Celery + Redis) — if you already run Celery here, share the broker rather than running two.
- **Existing memory pattern at `C:\Users\HP\.claude\projects\C--Users-HP\memory\`** — your `MEMORY.md` index + typed `.md` files with frontmatter is exactly the pattern. Apply it to the agent's memory vault verbatim.

---

## End-to-End Verification

1. **Bootstrap test:** `docker compose up` brings Ollama, Chroma, agent, UI online. `agent doctor` reports green on all.
2. **Synthetic-factory regression:** seeded fake plant + 15 hand-written skills → run 20 simulated days → assert at least 5 correction notes generated, at least 1 lesson promoted, recommendation cite-rate ≥ 95%.
3. **Air-gap test:** unplug WAN, confirm routine recommendations still flow via Ollama; hard queries queue with `pending_api_reach` status until network returns.
4. **Correction-learning test:** scripted planner overrides 3 times on the same pattern → 4th run, agent's recommendation reflects the corrections without API call.
5. **Reflection test:** seed 5 supplier-reliability corrections → run nightly worker → lesson draft appears in `memory-vault/lessons/`.
6. **Reload test:** kill the agent mid-recommendation, restart, LangGraph checkpoint resumes the same state.
7. **Vault integrity:** the agent must never write into `skills-vault/`. Enforced by mounting it read-only in Docker.

---

## What I'm Deliberately Not Doing (and Why)

- **No autonomous PO release** — you said advisory only. Don't build the auth/audit needed for autonomous until v2.
- **No vertical-specific scheduling math in core** — generic core stays vertical-agnostic; per-industry logic lives in `30-domain/`. See [[Generic vs Vertical]].
- **No web-scale vector DB (Qdrant cluster, Pinecone)** — single-plant scale doesn't need it. Chroma file is enough; migration path is clean if it ever isn't.
- **No fine-tuning** — RAG + corrections gets you 90% of self-improvement value at 5% of the cost and complexity.
- **No multi-tenant infra** — each customer is a separate single-box deployment for now. Multi-tenant comes only after 3+ paying customers force the conversation.

---

## Customer Onboarding

The full intake checklist (data, skills, people, deployment tiers) is in **[[Plan B - Data Sourcing]]**. Reference it from sales conversations.

## Open Questions for Later (not blocking)

- Which planner runs Obsidian — central planner only, or per-shift supervisors? Decides whether the memory vault is one or branched-by-role.
- GRN / outcome data freshness — daily batch or real-time? Decides whether outcome backfill is a nightly job or streaming.
- Who owns the skills-vault edits — the planner, or you (vendor) curate centrally and push? Decides skill-vault remote topology.
