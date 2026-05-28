---
title: "AI for Manufacturing Plant Production Automation"
subtitle: "Capture your best planner's knowledge before it walks out the door."
audience: "COO / MD / Plant Head — mid-size manufacturer"
duration: "10 minutes"
version: "v1.0 — 2026-05-28"
---

# Pitch Deck — AI for Manufacturing Plant Production Automation

> 14-slide narrative for a manufacturing decision-maker. Markdown is the **source of truth**. PPTX and PDF are generated from this file via `assets/generate-pptx.py` and `assets/generate-pdf.py`. Slide breaks are `---`.
>
> Related: [[Home]] · [[Primer]] · [[Plan A - Building the Agent]] · [[Plan B - Data Sourcing]]

---
slide: 1
layout: title
theme: dark
---

# Capture your best planner's knowledge

## before it walks out the door.

**An advisory AI agent for production scheduling and JIT procurement** — runs on a single machine inside your plant, learns from every decision your planner makes, and turns 15 years of tribal knowledge into an asset you own.

> Galvon · 2026

---
slide: 2
layout: full-bleed
theme: dark
---

# The Problem

Every manufacturing company has **one or two people who really know how to run the place**.

They decide what to make today. What to order. From whom. When to expedite. When to wait. Their knowledge is in their head — built from 15 years of being burned by Supplier A in monsoon, knowing Machine 4 hates a 2-hour run-then-stop, knowing Tata pays a ₹50K/day penalty if you slip.

**When that person is on leave, takes a competing job, or retires, the company loses money.**

---
slide: 3
layout: stats
theme: light
---

# What This Costs You — Today

A typical mid-size plant loses **₹2–8 Cr a year** to scheduling mistakes nobody captures.

| Where the money goes | Typical annual loss |
|---|---|
| Late-delivery penalties + lost orders | ₹40 L – 2 Cr |
| Expedited freight to recover slippage | ₹20 – 80 L |
| Scrap from bad changeover sequencing | ₹30 L – 1.5 Cr |
| Lost shifts to setup/changeover thrash | ₹50 L – 2 Cr |
| Excess working capital in safety stock | ₹1 – 3 Cr tied up |

These numbers don't show up in any one report. They're hidden across penalty debits, freight invoices, scrap registers, and inventory holding cost — and they grow when your best planner is on leave.

---
slide: 4
layout: split
theme: dark
---

# The Agent in One Picture

```
   FACTORY DATA               THE AGENT                THE PLANNER
   (ERP, Excel, MES)    ───►  reads, reasons,   ───►  approves / edits
                              cites rules                   │
                                                            ▼
                                                     CORRECTION
                                                     captured with
                                                     reasoning,
                                                     written to vault
                                                            │
                                                            ▼
                                                     next time the
                                                     agent retrieves
                                                     this correction
                                                     and does not
                                                     repeat the mistake
```

The agent does **not** decide for you. It recommends. The planner approves. Every edit teaches it. Everything is auditable.

---
slide: 5
layout: two-cards
theme: light
---

# Two Vaults — Playbook and Logbook

The agent reads from a **Skills Vault** (the factory's playbook, written by humans) and writes to a **Memory Vault** (the logbook of every decision, correction, and lesson learned).

::: card title="Skills Vault — your playbook"
- Written by you and the planner
- Plain markdown files in git
- VIP customer rules, machine quirks, supplier policies, changeover rules
- Read-only to the agent — it cannot accidentally edit your rules
:::

::: card title="Memory Vault — the agent's logbook"
- Written by the agent every time a decision happens
- Every recommendation, every edit, every reason
- After repeated overrides, the agent drafts a **Lesson** for you to approve
- 100% yours, in plain markdown, in git
:::

Both are plain text. Both are yours. If we disappear tomorrow, your knowledge is still readable in Notepad.

---
slide: 6
layout: diagram
theme: dark
---

# How It Learns — The Correction Loop

```
agent recommends ──► planner edits ──► correction note written
                          │                       │
                          │                  (3+ similar
                          │                   corrections)
                          │                       ▼
                          │              nightly reflection
                          │              drafts a Lesson
                          │                       │
                          │                       ▼
                          │              planner promotes it
                          │                       │
                          │                       ▼
                          └──── next decision uses the Lesson
                                — the mistake is not repeated
```

**This is the IP.** Every override is a permanent training signal. Three similar overrides become a promoted rule. The agent grows without anyone writing code.

---
slide: 7
layout: story
theme: light
---

# A Tuesday Morning at "Acme Auto Parts"

**9:00 AM** — Rakesh arrives. The agent has already drafted today's schedule and tomorrow's reorder list, with citations to every rule it used.

**9:05 AM** — Rakesh reviews. The Tata priority rule is right. The Machine 4 warmup rule is right. But he bumps a Mahindra work order ahead because Mahindra called him last night about a launch event Friday. He types one sentence — *"Mahindra emergency, Friday launch"* — and clicks Approve.

**9:06 AM** — The agent writes a correction note: what it said, what Rakesh did, why.

**11:30 AM** — Machine 4 trips. The agent re-plans in seconds and offers two options with citations. Rakesh picks one. No correction needed this time.

**30 days later** — Rakesh has overridden the agent 4 times on Mahindra emergencies. The agent drafts a Lesson:
> *"When a Mahindra emergency call is logged, treat Mahindra orders as same-priority as Tata for 48 hours."*

Rakesh edits one word, promotes it. From tomorrow, the agent applies the rule automatically. **Rakesh stops having to make the same correction.**

---
slide: 8
layout: chart
theme: dark
---

# The Value Compounds

```
Planner
override rate

 100% │██
      │  ████████
  75% │         ████████
      │                 ████████
  50% │                          ██████████
      │                                    ████████
  25% │                                            ████████████
      │                                                        ██████████
  10% │                                                                  ████████
      │
      └─────────────────────────────────────────────────────────────────────────►
       Week 1     Week 4     Week 8     Month 3     Month 6     Month 12
```

| Phase | What's happening |
|---|---|
| **Week 1** | Agent ships generic. ~80% override rate. **Corrections are the product**, not the recommendations. |
| **Month 1** | ~50 corrections captured. Override rate ~50%. |
| **Month 3** | ~10 promoted Lessons. Override rate ~25%. |
| **Month 6** | ~30 active Lessons. Override rate ~10%. **The agent recommends what your best planner would, even when they're on leave.** |
| **Month 12** | Steady state. Quarterly Lesson review. The institutional knowledge that used to walk out at 6pm now lives in your vault. |

---
slide: 9
layout: technical
theme: light
---

# What Makes Real Manufacturing Hard

Most "AI scheduling" demos work on toy plants — one product, one line, one supplier. **Real plants don't look like that.** Your products share upstream processes, your BOMs are multi-level, and one quality reject cascades into a dozen downstream orders.

| Real-plant problem | What the agent does |
|---|---|
| Multiple finals share an upstream WIP (e.g. one furnace heat feeds rebar + wire rod + structural) | Models items as a **DAG**, not a flat list. Aggregates demand at the shared step. |
| Multi-level BOM with shared sub-assemblies | BOM-explode walks the tree, computes cumulative lead time, hits MOQ once instead of three small batches. |
| Supply at a shared step < total demand from finals | Runs your **allocation policy** as a skill (which customer takes the hit, which slips, why). |
| Quality reject at a shared upstream step | Walks `where_used` forward, shows you which downstream orders will slip and by how much. |
| Supplier slip during monsoon / festival / year-end | Applies promoted Lessons to inflate that supplier's effective lead time for that season only. |

This is the **MPS + MRP + daily-schedule loop** every plant runs in spreadsheets today — but now with rules and lessons that evolve.

---
slide: 10
layout: three-cards
theme: light
---

# One Engine, Three Verticals

Same core. Three skill packs. **The agent ships pre-loaded with rules that match how your industry actually runs.**

::: card title="Discrete" accent="ember"
**Auto parts · electronics · panel building · machining**

- Kanban-pull triggers and WIP caps
- Due-date prioritization with critical-ratio tweaks
- Lot-traceability protection on serialized parts
- Cell-grouping and changeover sequencing
:::

::: card title="Batch" accent="teal"
**Chemicals · food · pharma · paints · cosmetics**

- Recipe-driven material consumption
- Campaign batching, grade transitions, CIP/SIP rules
- Expiry-aware FIFO
- 21-CFR-11 / GMP-aware scheduling
:::

::: card title="Process" accent="indigo"
**Cement · steel · paper · refineries · smelters**

- TOC drum-buffer-rope bottleneck protection
- Grade-transition slope rules
- Utility-tariff peak/off-peak load shifting
- Variable-yield JIT for consumables
:::

---
slide: 11
layout: split
theme: dark
---

# Your Data Stays In Your Plant

The agent runs **locally**. Routine queries — *"recompute the kanban refill"*, *"explode this BOM"* — never leave your network. Only the genuinely hard reasoning escalates to a remote model, and even then no master data crosses the wire.

| Where it runs | What it does | Cost |
|---|---|---|
| **Local Ollama** (on your plant PC) | 90% of decisions — routine scheduling, JIT triggers, retrieval, Q&A | Hardware amortization only |
| **Claude API** (escalation only) | Complex re-planning, lesson synthesis, anomaly explanation | ~₹250–400 / month per plant |
| **Haiku classifier** | Routes each query to the right model | ~₹40 / month per plant |

**The plant never stops getting useful output, even when the internet is down.** Hard queries queue with a clear status. Routine schedules and JIT triggers stay current.

Minimum hardware to start: 16 GB RAM, 8 cores. No GPU required for Bronze tier.

---
slide: 12
layout: tier-table
theme: light
---

# Deployment Roadmap — Bronze → Platinum

You don't commit to everything on Day 1. We tier the engagement so you see value in Week 1 and earn the right to escalate.

| Tier | What you give us | What the agent does | Time to value |
|---|---|---|---|
| **Bronze** | Item master + BOM + supplier list + weekly Excel exports | Weekly schedule recommendation + JIT reorder list + generic priority ranking | **Week 1** |
| **Silver** | Above + ERP read or daily file exports + 15–20 customer skills authored in a 1-day workshop | Daily schedule, daily PO suggestions, supplier-reliability-aware JIT, customer-aware prioritization | **Week 4** |
| **Gold** | Above + MES/SCADA live feed + production confirmations + GRN data | Reactive rescheduling on machine-down, closed-loop learning, promoted Lessons, anomaly explanations | **Month 3** |
| **Platinum** | Time-gated, not feature-gated. 6+ months of accumulated corrections and Lessons. | Genuinely personalized. Override rate ~10%. Defensible knowledge moat that competitors cannot port. | **Month 6+** |

Each transition is a renewal moment, not a cliff. You upgrade when you're ready — not when a sales rep says so.

---
slide: 13
layout: two-cards
theme: light
---

# What You Give Us / What You Own

::: card title="Minimal intake — Week 1" accent="ember"
- Item master + BOM + supplier list (Excel is fine)
- One named planner — 30 min/day for 60 days
- One IT person — 4 hours total, Week 1
- One shared folder for daily file drops
- One PC inside the plant: 16 GB RAM, 8 cores

**That's it.** No ERP rip-and-replace. No MES integration on Day 1. No 6-month "data foundation" prerequisite.
:::

::: card title="What you keep — forever" accent="teal"
- **Skills Vault** — every rule you authored
- **Memory Vault** — every decision, correction, Lesson the agent learned
- Both are plain markdown files in your own git repo
- If you cancel the subscription, the vaults stay yours
- A successor planner starts at Month-6 quality, not Week-1
:::

**The agent runtime is the recurring revenue. The vaults are the customer-owned asset.** That asymmetry is the deal.

---
slide: 14
layout: cta
theme: dark
---

# The Next Step

We don't sell on the first call. We run a **30-minute Customer Readiness Audit** — a checklist against your master data, your planner availability, and your IT access.

You walk away with:

1. A **tier recommendation** (Bronze / Silver / Gold) based on what your plant can realistically support today.
2. A **go / no-go** call, given honestly. We will tell you if you should fix your data foundation before starting.
3. A **fixed-fee Week-1 pilot quote**, if you proceed.

> **Book the audit:**
> chatgptnotes@gmail.com · Dr. Murali B. K. — Galvon
> *Or talk to Saikat (automation engineer, 20+ years) directly.*

---

# Appendix — Source Notes

This deck is generated from the canonical project vault. For depth on any slide, open the linked notes:

- **Problem & narrative** — [[Primer]]
- **Architecture & build phases** — [[Plan A - Building the Agent]]
- **Customer intake** — [[Plan B - Data Sourcing]]
- **The Correction Loop (the IP)** — [[Correction Loop]] · [[Correction Note]] · [[Lesson]]
- **The two vaults** — [[Skills Vault]] · [[Memory Vault]]
- **Real-plant complexity** — [[Multi-Level BOM]] · [[Shared WIPs]] · [[Master Production Schedule]]
- **Verticals** — [[Generic vs Vertical]]
- **AI architecture** — [[Hybrid LLM Routing]] · [[Cyclic RAG]]
- **Tiers** — [[Deployment Tiers]]
- **Read-only conversational companion** — [[Chat Sidecar]]
