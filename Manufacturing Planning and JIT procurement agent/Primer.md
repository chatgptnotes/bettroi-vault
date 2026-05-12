# Primer — Understanding the Mfg Agent Before We Build It

> **Read this first.** Plain-English explanation of *what* the agent is, *why* each piece exists, and *how* the value compounds — with walkthroughs.
>
> Then: **[[Plan A - Building the Agent]]** for *how to build it*.
> Then: **[[Plan B - Data Sourcing]]** for *what each customer needs to give us*.
>
> [[Home]]

---

## 1. The Problem We're Solving (in one paragraph)

Every manufacturing company in India has **one or two people who really know how to run the place**. They decide what to make today, what to order from whom, when to expedite, when to wait. Their knowledge is in their head — built from 15 years of being burned by Supplier A in monsoon, knowing that Machine 4 hates a 2-hour run-then-stop, knowing Tata pays a 50K/day penalty if you slip. **When that person is on leave, takes a competing job, or retires, the company loses money.** The agent is a system that (a) makes that knowledge explicit on day one, (b) helps the planner do their job faster every day, and (c) **captures every correction the planner makes so the company's knowledge accumulates in a vault the company owns** — instead of walking out the door at 6pm.

---

## 2. The Agent in One Picture

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   FACTORY DATA               THE AGENT                THE PLANNER    │
│   (ERP, Excel, MES)    ───►  reasons over data  ───►  approves /     │
│                              + rules (skills)         edits          │
│                              + memory (past             │            │
│                              decisions + corrections)   │            │
│                                                         ▼            │
│                                                  CORRECTION          │
│                                                  is captured         │
│                                                  with reasoning,     │
│                                                  written to vault    │
│                                                         │            │
│                                                         ▼            │
│                                                  next time agent     │
│                                                  retrieves this      │
│                                                  correction and      │
│                                                  doesn't repeat      │
│                                                  the mistake         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

That's the whole system. Everything else in the plans is an implementation detail of this picture.

---

## 3. Three Mental Models to Memorize

### 3.1 — Two vaults, two purposes

| Vault | Who writes it | What's in it | Analogy |
|---|---|---|---|
| **[[Skills Vault]]** | Humans (you + the planner) | The *rules* of how this factory runs. SOPs, priorities, machine quirks, supplier policies. | The factory's **playbook** — what everyone *should* do. |
| **[[Memory Vault]]** | The agent | Every decision the agent made, every time the planner corrected it, and lessons synthesized from patterns. | The factory's **logbook** — what *actually happened* and what we learned. |

> **Why split them?** Because the playbook is a curated artifact you defend, and the logbook is a high-volume append-only stream. Mixing them creates a mess. Keeping them separate also means the agent **cannot accidentally edit the rules** — it can only write to its own logbook.

### 3.2 — Three kinds of knowledge

The agent reasons from three things, weighted in this order:

1. **Active [[Lesson|lessons]]** (highest weight) — patterns the planner has confirmed: *"in monsoon, treat Supplier A's quoted lead time as +4 days."*
2. **Skills** (medium weight) — the curated playbook: *"VIP customers ship same-week regardless of cost."*
3. **[[Episode|Episodes]]** (lowest weight) — raw past decisions, useful for case-based reasoning: *"last Tuesday in similar conditions, we did X and it worked."*

Lessons outrank skills, skills outrank episodes. **A lesson is only created when 3+ similar corrections exist** — so lessons represent things the planner has implicitly endorsed multiple times.

### 3.3 — The [[Correction Loop]] (this is the IP)

```
agent recommends ──► planner edits ──► agent writes a correction note
                          │                       │
                          │                       │ (3+ similar
                          │                       │  corrections)
                          │                       ▼
                          │              nightly reflection
                          │              synthesizes a draft lesson
                          │                       │
                          │                       ▼
                          │              planner promotes to active
                          │                       │
                          │                       ▼
                          └──── next decision retrieves the lesson
                                and the agent doesn't repeat the mistake
```

**Why this matters:** the customer doesn't just buy software, they buy a system that captures the institutional knowledge sitting in one person's head. That capture is irreversible — even if they cancel the subscription, their corrections-and-lessons vault is theirs, in plain markdown files, in git.

---

## 4. A Day in the Life (Tuesday, 9:00 AM at "Acme Auto Parts")

### 9:00 AM — Planner arrives
Rakesh, the planner, opens the approval UI. The agent has overnight:

- Read yesterday's production confirmations from the MES.
- Read overnight sales orders from Tally.
- Pulled inventory snapshot from the ERP.
- Generated a **Day Plan** for today and a **JIT Reorder List** for tomorrow.

The screen shows:

> **Day Plan (Tue, 12 May)**
> - Line 1: run WO-4471 (Tata brake pads, 800 units), 7:00–14:00
> - Line 2: run WO-4485 (Mahindra brackets, 1200 units), 7:00–16:00
> - Line 3: changeover then run WO-4490, 11:00–18:00
>
> **Citations:** `customer-vip-tier` (Tata priority), `line1-warmup-rule` (avoids 6am start), `monsoon-supplier-A-lesson` (avoided sourcing the 4mm steel from Supplier A)
>
> **JIT Reorder List (for receipt by Thu)**
> - 4mm steel, 2 tons, Supplier B (₹4,200/t premium over A, justified by monsoon reliability lesson)
> - Hex bolts M8, 5000 pcs, Supplier C
> - Lubricant grade 32, 200 L, Supplier D

### 9:05 AM — Rakesh reviews
He scans the citations. The Tata priority is right. The warmup rule is right. He clicks the monsoon-lesson citation — it opens an Obsidian note showing "Supplier A missed 3 deliveries last monsoon, draft promoted to active on 2025-08-12, cited by 14 subsequent decisions." Good.

But — he changes one thing. He bumps WO-4485 ahead of WO-4471 because Mahindra called him last night about a delay-sensitive batch. He clicks **Edit**, swaps the priority, types "*Mahindra emergency call from Suresh, batch is for a launch event Friday*", and hits **Approve**.

### 9:06 AM — Behind the scenes
The agent writes:
- `memory-vault/episodes/2026/05/12/ep-2026-05-12-014.md` — full state + recommendation + planner edit (see [[Episode]])
- `memory-vault/corrections/2026-05-12_mahindra-emergency.md` — what I said, what Rakesh did, why, tagged `customer-call`, `mahindra`, `emergency-override` (see [[Correction Note]])

### 11:30 AM — Machine 4 trips on Line 2
The MES adapter pushes a `machine_down` event. The agent re-plans, sees that WO-4485 will slip by 3 hours, and pushes an alert to Rakesh:

> "Machine 4 down on Line 2. WO-4485 will slip from 16:00 to 19:00.
> Option A: run remainder on Line 3 after WO-4490 (slip 1 hr)
> Option B: split lot to Line 1 after WO-4471 (slip 0 hr but traceability skill says no)
> **Recommend Option A.** Citations: `no-traceability-split-lots`, `mahindra-emergency` (today)."

Rakesh approves Option A. Another episode, no correction this time — the agent's recommendation matched.

### End of day — Episode outcomes back-fill
The day's production confirmations come in. The system back-fills every episode with `outcome: on_time` or `outcome: late`. Tonight's reflection job has 11 episodes from today to learn from.

### 30 days later — A lesson is born
Reflection runs nightly. It notices Rakesh has overridden the agent **4 times** when a Mahindra emergency call came in — always promoting the Mahindra WO. It drafts a lesson:

> `lessons/mahindra-emergency-override.md` (draft)
> When a Mahindra emergency call is logged, treat Mahindra WOs as same-priority as Tata for the next 48 hours.

Rakesh sees the draft in his "Lessons to review" tab. He edits it slightly — "48 hours unless overridden in the call notes" — and clicks **Promote to active**. From tomorrow, the agent applies this rule automatically and Rakesh stops having to make the same correction.

**This is the system working as designed.**

---

## 5. Why Each Design Decision Exists (so you can defend them)

| Decision | Reason (in plain English) |
|---|---|
| **Advisory only, not autonomous** | An agent that places POs on its own needs audit, rollback, and legal sign-off. Skip all of that for v1. The planner is the safety net. |
| **[[Hybrid LLM Routing]]** | Routine queries on the local Ollama model = cheap, fast, no data leaves the plant. Hard reasoning escalates to Claude = best quality when it matters. You get both. |
| **Obsidian + git for both vaults** | The planner can read and edit skills in a normal note-taking app. Git gives version history "for free." No special database, no special UI, no lock-in. If we disappear, the customer still has all their knowledge in plain markdown. |
| **Two vaults, not one** | Stops the agent from accidentally editing the playbook. Lets you mount the skills-vault read-only in Docker as a hard guarantee. |
| **Citations on every recommendation** | Forces the agent to ground its decisions in named skills/lessons. Uncited recommendations are rejected. This is what makes corrections trainable — you can see *which skill* the agent misapplied. |
| **Correction = "what you said" + "what I did" + "why"** | A planner just clicking "edit" isn't enough. The *why* is the learning signal. The mandatory "why" field is the most important UI detail. |
| **Reflection promotes only when N≥3** | One correction might be a one-off. Three corrections is a pattern. This threshold stops the agent from over-fitting to a single bad day. |
| **[[Generic vs Vertical]]** | One codebase, many industries. The differentiation is in `30-domain/discrete/` etc., not in the engine. Sell horizontally, ship per-vertical packages. |
| **LangGraph state machine, not free-form agent loop** | A free-form ReAct-style agent is unpredictable. A state machine is auditable, replayable, and exactly what advisory mode needs — every decision is a node, every node is logged. |
| **Chroma file, not Pinecone** | Single-plant scale doesn't need a hosted vector DB. A 200MB file on disk does the job. Migration to Qdrant later is one config change. |
| **No fine-tuning** | RAG + corrections gives you ~90% of self-improvement at 5% of the cost and complexity. Fine-tuning per-customer is a maintenance nightmare. |

---

## 6. How the Value Compounds (the slide you draw for the customer)

```
Override rate
(planner edits)
       100% │██
            │  ██████
        75% │       ████████
            │              ████████
        50% │                     ██████████
            │                              ████████
        25% │                                     ████████████
            │                                                ██████████
        10% │                                                          ████████
            │
            └────────────────────────────────────────────────────────────────────►
            Week 1     Week 4      Week 8     Month 3     Month 6     Month 12
```

| Phase | What's happening |
|---|---|
| **Week 1** | Agent ships with generic skills. Override rate ~80%. Every override is a correction note. **The corrections are the product right now, not the recommendations.** |
| **Week 4** | Skills-vault has 30+ entries. Most routine decisions are right. Override rate ~50%. |
| **Month 3** | Reflection has promoted ~10 lessons. Agent recommendations cite them. Override rate ~25%. |
| **Month 6** | 30+ active lessons. The agent is now meaningfully personalized. Override rate ~10%. **Replacing the agent at this point means the customer loses 6 months of captured knowledge.** Lock-in achieved. |
| **Month 12** | Lessons start to decay (the anti-drift guardrail). Planner reviews dormant lessons quarterly. System is in steady state. |

**The economic argument to the customer:** every override that used to be lost is now permanent IP. Even if Rakesh leaves, the next planner starts at month-6 quality, not week-1.

---

## 7. How This Helps Different Industry Types

The agent core is generic (see [[Generic vs Vertical]]). The *skills folder* makes it industry-specific.

| Industry | What the agent does best |
|---|---|
| **Discrete (auto parts, electronics, panel building)** | Kanban-triggered JIT, due-date prioritization, capacity balancing across machines, traceability protection on lot splits |
| **Batch (chemicals, food, pharma)** | Changeover-sequence optimization, campaign batching, expiry-aware FIFO, recipe-driven material consumption |
| **Process (cement, steel, paper)** | Bottleneck protection (TOC), grade-transition planning, utility-tariff-aware run windows, byproduct/consumable JIT |

**The pitch is always the same:** *generic 60%, your tribal knowledge 40%, accumulating over time.* The verticals just change which generic skills ship pre-loaded and which interview questions you ask during the onboarding workshop.

---

## 8. What This Is *Not* (so you don't oversell)

- **Not a demand forecaster.** It schedules and procures against demand the customer provides. If they want forecasting, that's a separate plug-in.
- **Not an ERP replacement.** It sits *next to* the ERP, reads from it, advises the planner. The ERP is still the system of record.
- **Not an MES replacement.** It consumes MES data, doesn't replace the floor control.
- **Not autonomous.** It does not place POs or release work orders on its own. Every action goes through the planner.
- **Not a chatbot *for decisions*.** Decisions live in the structured approval UI — that's where audit and the [[Correction Loop]] happen. **There is a [[Chat Sidecar]] for asking *about* decisions** (the planner can interrogate the agent, browse [[Memory Vault|memory]], do what-if analysis), but the chat cannot place POs, write [[Correction Note|corrections]], or take action. Structured flow for actions; chat for explanation.

---

## 9. The Whiteboard Version (when a customer asks "what does it do?")

Draw three boxes:

```
   ┌───────────┐      ┌──────────┐      ┌──────────┐
   │  FACTORY  │ ────►│   AGENT  │ ────►│ PLANNER  │
   │   DATA    │      │ (reads + │      │ approves │
   │           │      │ reasons) │      │ / edits  │
   └───────────┘      └─────▲────┘      └────┬─────┘
                            │                │
                            │                │
                      ┌─────┴────────────────┴─────┐
                      │   VAULT (rules + memory)    │
                      │   - playbook (skills)       │
                      │   - logbook (episodes)      │
                      │   - learned lessons         │
                      └─────────────────────────────┘
```

Say: *"The agent reads your factory data, applies your rules, recommends a schedule and a purchase list. The planner approves or edits. Every edit teaches it. Over six months it becomes your best planner, on paper, owned by you."*

That's the whole pitch.

---

## 10. Reading Order Going Forward

1. **This primer** — you, internalize it.
2. **[[Plan A - Building the Agent]]** — engineering, when ready to build.
3. **[[Plan B - Data Sourcing]]** — sales conversations, customer intake.

When something in A or B feels mechanical and you forget *why* it's there, come back to this primer.
