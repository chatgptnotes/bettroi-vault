---
department: general
agent_pack: ai-first-playbook
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, concepts, glossary, framework]
---

# Be AI-First Playbook — Core Concepts

The five vocabulary items every client must understand before Day 1 of Discovery. The interactive tool surfaces these as inline tooltips on first appearance.

> Source video referenced by user: youtube.com/watch?v=bk46OxGjOFo (the AI-First Business Framework). These concepts already underpin the HopeTech framework PDF — this file makes them explicit and teachable.

---

## 1. Closed Loops 🔁

**What it is.** A workflow that monitors its own output, scores it against a known-good standard, and feeds insights back in to improve next time. Compare with **open-loop**: task is executed once, no feedback, errors silently accumulate.

**In practice.**
```
Open loop:   Input → Agent → Output → 🤞 hope it's good
Closed loop: Input → Agent → Output → Score against test harness
                       ▲                       │
                       └─── prompt refinement ─┘
```

**Why it matters for AI-First.** Without closed loops, agent quality drifts. With them, the system gets *smarter every week without engineering touching it*. The weekly 15-min AI Retro is the human-side closed loop; the scoring checklist on each agent is the machine-side closed loop.

**Where it shows up in the playbook.** Step 7, Step 8 (every shipped agent must have a scoring checklist before going live).

---

## 2. Business Brain 🧠

**What it is.** All company knowledge — SOPs, pricing, processes, org chart, client patterns — structured in a format AI agents can query, cite, and act on.

**Why it's not just "documentation".** Documentation is for humans (PDFs, Confluence, Word). A Business Brain is for *both* humans and machines: Markdown with frontmatter, indexed in a vector DB, version-controlled, with explicit single-source-of-truth rules.

**This vault** (`bettroi-vault`) IS Hope Hospital's Business Brain. See `decisions/0001-obsidian-as-source-of-truth.md` and `README.md`.

**Where it shows up in the playbook.** Phase 2 Wire (Steps 5–6) is entirely about building this.

---

## 3. Test Harnesses ✅

**What it is.** A set of predefined criteria that AI uses to self-check its output **before** a human reviews it. Think of it as the agent's "definition of done".

**Example** — Pharmacy Reorder Agent test harness:
```yaml
must_pass:
  - every_recommended_item_has_supplier: true
  - quantities_round_to_pack_size: true
  - no_recommendation_exceeds_180_day_supply: true
  - flagged_for_review_if: [out_of_pattern, supplier_changed_recently, NDC_unverified]
score_threshold: 8/10  # below = loop back to refine, above = ship to human reviewer
```

**Why it matters.** Without test harnesses you depend on humans catching errors. With them, the agent self-corrects most of the time and the human only sees the ~10% it couldn't pass alone.

**Where it shows up in the playbook.** Step 7, Step 8 — a scoring checklist per agent is part of the "done when" criteria.

---

## 4. New Org Structures (IC / DRI / AI Founder) 🏢

**What it is.** Replace traditional middle management (status reporting, weekly summaries, daily standups) with an *intelligence layer* (an AI agent that does the routing). Roles re-shape:

| Old role | New role | What they do |
|---|---|---|
| Junior staff doing rote work | **IC (Individual Contributor)** | Builds prototypes, drafts, first cuts — paired with an AI agent |
| Department lead doing status reporting | **DRI (Directly Responsible Individual)** | Owns one outcome end-to-end; has authority to ship; reviews AI output |
| C-suite synthesising reports | **AI Founder** | Sets vision, reviews intelligence-layer dashboard, makes capital allocation decisions |
| Middle managers (status routers) | **AI Ops Lead** | Owns Business Brain + agent library + quality bar |

**Why it matters.** A 3-person AI-First team can outperform a 30-person traditional team because the routing/reporting overhead disappears.

**Where it shows up in the playbook.** Step 9 (intelligence layer goes live), Step 10 (Scale — replace headcount with leverage).

---

## 5. Token Maxing 💸

**What it is.** Economic model shift. Instead of scaling output by hiring more people, scale by increasing tokens-per-dollar (cheaper inference) and tokens-per-task (better prompts).

**Concrete metric — AI Leverage Ratio:**
```
AI Leverage Ratio = Tasks completed per week
                    ─────────────────────────
                    Hours of human input

Year 1 trajectory: 2× → 5× → 10× quarter over quarter.
```

**Levers to pull:**
- **Cheaper tokens:** migrate to `claude-code-deepseek-backend` (60–80% inference cost cut).
- **Better prompts:** AI Skills Library v1 → reusable prompts captured by `ironbark`.
- **More agents:** continuous expansion onto next 10 processes.
- **Fewer humans-in-the-loop:** raise scoring thresholds as trust grows.

**Why it matters.** This is *the* unit economics of an AI-First company. Without it, you're just adding AI tools to a traditional cost structure — same headcount, more SaaS bills. With it, marginal output goes up while marginal cost stays flat.

**Where it shows up in the playbook.** Step 9, Step 10 (Scale phase). Also tracked monthly by leadership per Governance section.

---

## How these connect

```
                 ┌─────────────────────────────────────────────┐
                 │              AI Founder (vision)             │
                 └────────────────────┬────────────────────────┘
                                      │ reviews
                            ┌─────────▼──────────┐
                            │ Intelligence Layer  │  ← replaces middle-mgmt
                            │  (AI dashboards)    │
                            └─────────┬──────────┘
                                      │ routes work
       ┌──────────────────┬───────────┴────────────┬──────────────────┐
       ▼                  ▼                        ▼                  ▼
   Marketing DRI      Sales DRI               Delivery DRI       Finance DRI
       │                  │                        │                  │
       ▼                  ▼                        ▼                  ▼
  Marketing Agent     Sales Agent           Delivery Agent     Finance Agent
  (closed loop +     (closed loop +         (closed loop +    (closed loop +
   test harness)      test harness)          test harness)     test harness)
       │                  │                        │                  │
       └──────────────────┴───────┬────────────────┴──────────────────┘
                                  │ reads
                          ┌───────▼───────┐
                          │ Business Brain │  ← this vault
                          │  (Obsidian)    │
                          └────────────────┘
                                  │
                          token-maxing economics
                          (more output / less $$)
```

The full system: AI Founder sets direction → intelligence layer routes → DRIs own outcomes → agents do the work, grounded in the Business Brain, governed by closed loops + test harnesses, optimised for token-max economics.

---

## How to use this file

- **In sales conversations:** when a prospect uses one of these terms loosely, quote the precise definition.
- **In the interactive tool:** each term is a hover-tooltip with the first paragraph + a "Read more" link to this file.
- **In Discovery (Step 0):** include a 10-min explainer of these 5 concepts before the audit begins — saves hours of confusion downstream.
