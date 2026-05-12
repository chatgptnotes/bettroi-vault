# Master Production Schedule

> The agent runs MPS, MRP, and daily scheduling as one integrated loop, every night and on event. The math is 50-year-old industrial engineering; the layering of [[Skills Vault|skills]], [[Lesson|lessons]], [[Cyclic RAG|cyclic RAG]], and the [[Correction Loop]] on top is the actual IP.

## The Five Planning Layers (Industrial Engineering Canon)

Real plants run all five. The agent automates layers 2–5; layer 1 is human strategic work.

| Layer | Horizon | What gets decided | Who runs it | Agent's role |
|---|---|---|---|---|
| **S&OP** (Sales & Operations Planning) | 6–18 months | Capacity investments, hiring, big-customer commitments | MD + sales head + ops head | ❌ Not automated |
| **MPS** (Master Production Schedule) | 4–12 weeks | Which final products to make in which week | Production planner | ✅ Agent generates, planner approves |
| **MRP** (Material Requirements Planning) | 1–8 weeks | Which WIPs and raw materials to procure/produce, when | Production planner + buyer | ✅ Agent generates, planner approves |
| **CRP** (Capacity Requirements Planning) | 1–4 weeks | Verify each work center has capacity for the plan | Production planner | ✅ Agent verifies, flags slips |
| **Daily / Shift Schedule** | 1–3 days | Which jobs run on which machine in what sequence | Shop-floor supervisor | ✅ Agent dispatches, supervisor confirms |

## The Two Scheduling Techniques (Both Run Continuously)

### Backward Scheduling
Start from the customer's due date, subtract each operation's lead time, land on "when must this start?" Gives the **latest acceptable start** for every step.

### Forward Scheduling
Start from today, add each operation's lead time, land on "when will this actually finish?" Reality check.

**The gap** between backward-latest-start and forward-earliest-finish tells you which orders are at risk. The planner trades off between them; the agent surfaces the trade-offs with citations.

## Worked Example — Shared WIP-5 with Three Orders

This is the canonical scenario to internalize. Today = Day 1.

### Setup

- **5 upstream steps shared across all final products** → produce **WIP-5**.
- Total cycle time to make WIP-5 = 2 days.
- After WIP-5, three final products with different downstream cycles:

| Product | Downstream days | Total cycle |
|---|---|---|
| P1 | 8 | 10 days |
| P2 | 13 | 15 days |
| P3 | 6 | 8 days |

### Orders on the books

| Order | Product | Qty | Due Date |
|---|---|---|---|
| A | P1 | 500 | Day 30 |
| B | P2 | 800 | Day 35 |
| C | P3 | 300 | Day 20 |

### Step 1 — Backward schedule each order: when must WIP-5 be ready?

```
Order A (P1, due 30, 8 downstream days): WIP-5 ready by Day 22
Order B (P2, due 35, 13 downstream days): WIP-5 ready by Day 22
Order C (P3, due 20,  6 downstream days): WIP-5 ready by Day 14
```

### Step 2 — Aggregate WIP-5 demand by time bucket

```
WIP-5 needed by Day 14: 300 units (Order C)
WIP-5 needed by Day 22: 1,300 units (Orders A + B)
```

This aggregation is the [[Shared WIPs]] payoff.

### Step 3 — Decide WIP-5 production start dates

WIP-5 takes 2 days to make. So:

```
For the Day-14 batch:   start WIP-5 production by Day 12
For the Day-22 batch:   start WIP-5 production by Day 20
```

### Step 4 — Lot-sizing decision (skill-driven)

| Policy | When to use | Result for this example |
|---|---|---|
| **Pull (match demand)** | Low changeover cost, low shelf-life | Two runs: 300 starting Day 12, 1,300 starting Day 20 |
| **Campaign weekly** | High changeover cost, good shelf life | One run: 1,600 starting Day 18, finishing Day 20, holds inventory for Order C as FG |
| **Hybrid** | Mid-changeover | 300 on Day 12 + 1,300 on Day 20, but pre-stage raw material once |

The customer's `wip5-lot-sizing.md` skill determines which policy. The agent cites the skill; planner can change it; the [[Correction Loop]] refines it over time.

### Step 5 — Forward schedule to capacity-check

Suppose the shared WIP-5 line runs at 600 units/day max.
- 300 units = half a day → easy.
- 1,300 units = 2.17 days → fits in Day 20–22 only just.

If a new order arrives demanding WIP-5 on Day 22 → over capacity → the agent flags **which order will slip** using the allocation skill.

### Step 6 — Raw material JIT (walks further back through the BOM)

BOM-explode 1,600 units of WIP-5 → e.g., 8,000 kg of Raw Material R.

```
Supplier A quoted lead time: 5 days
Active lesson (monsoon, today is in August): +4 days
Adjusted lead time: 9 days

Order C (300 WIP-5) starts Day 12: must order R by Day 3
Order A+B (1,300 WIP-5) starts Day 20: must order R by Day 11
```

The agent recommends PO release on Day 3 and Day 11, **citing the monsoon lesson** for the lead-time inflation.

### Step 7 — Daily schedule for Day 12

```
Line 1 (shared steps 1–5)
  07:00–09:00   Step 1 on raw material batch for Order C  (300 units)
  09:00–11:00   Step 2 on Order C batch
  11:00–13:00   Step 3 on Order C batch
  14:00–16:00   Step 4 on Order C batch
  16:00–18:00   Step 5 on Order C batch  → WIP-5 ready Day 14 ✓

  Operator: Suresh (per shift-roster skill)
  Citations: wip5-lot-sizing (pull policy), order-c-priority (standard)
```

## What the Planner Sees

### Dashboard A — Master Production Schedule (4-week view)

```
                Wk1     Wk2     Wk3     Wk4    Status
P1 (Order A)    -       -       250     250    On-time
P2 (Order B)    -       -       400     400    On-time
P3 (Order C)    -       300     -       -      On-time

WIP-5 plan      -       300     -       1300   (matches demand)
WIP-5 demand    -       300     -       1300

Raw R need      8000kg  -       -       -      (PO advised Day 3)
```

Color-coded — green for on-time, amber for tight, red for slipping. Citations as Obsidian wiki-links.

### Dashboard B — Daily Schedule (today + tomorrow)

Gantt-style: work centers on rows, hours on columns, jobs as colored blocks. Click any block → see the citation trail back to the MPS and the originating customer order.

### Chat Sidecar — natural-language interrogation

See [[Chat Sidecar]]. The Retrieval Detective and Counterfactual Player archetypes are especially useful here:

- *"Why does Order C's WIP-5 production start on Day 12?"* → backward-scheduling trace.
- *"What if I move the WIP-5 campaign to Day 18 and combine both batches?"* → counterfactual replan.
- *"What's the latest I can release WIP-5 for Order A without slipping?"* → answers with margin.

## Re-Planning Triggers — When the Loop Re-Runs

| Trigger | Scope of re-run |
|---|---|
| Nightly (default) | Full MPS + MRP + daily |
| New order arrives | MPS + downstream cascade |
| Machine breakdown | Daily + capacity check on MPS |
| Quality reject | Daily + failure-propagation cascade — see [[Shared WIPs]] |
| Supplier delay notification | MRP + JIT re-trigger |
| Planner request via chat | Whatever scope they specify |

## Where It Stays Hard (and Where Skills/Lessons Earn Their Keep)

1. **Variable cycle times** — WIP-5 quoted at 2 days might actually take 2.5. The agent learns from [[Episode]] outcomes and adjusts the lead time it uses in backward-scheduling. Emergent [[Lesson]], not manual setting.
2. **Sequence-dependent changeovers** at the shared step — Light-Yellow before Dark-Blue costs 30 min; Dark-Blue before Light-Yellow costs 4 hours. The sequencing skill knows this; without it, the campaign schedule wastes shifts.
3. **Capacity vs due-date trade-off** — if total demand exceeds capacity, someone slips. The allocation skill decides; corrections refine it.
4. **Lot-sizing under demand uncertainty** — campaign means inventory exposure; pull means changeover exposure. The right choice depends on forecast confidence, which is itself a planner judgment that becomes a lesson.
5. **Hot orders disrupting a stable plan** — a Mahindra emergency call on Day 14 demands re-planning. Insertion logic must minimize disruption to other in-flight orders, and which orders are "untouchable" is a customer-VIP skill.

## The One-Slide Summary (for the customer)

> **The agent runs MPS, MRP, and daily scheduling as one integrated loop, every night and on event.**
> **Math comes from 50-year-old MRP/MPS techniques** — backward-schedule, aggregate at shared steps, forward-schedule to verify, lot-size at shared steps, JIT raw materials.
> **The IP is everything layered on top:** every recommendation cites the skills and lessons that drove it; every planner edit becomes a correction; every pattern of corrections becomes a lesson; lessons modify future scheduling math without anyone writing code.
> **The planner sees a 4-week MPS dashboard, a 2-day daily schedule, and a chat sidecar to interrogate any decision.**

## See Also

- [[Shared WIPs]] — the operational reality this scheduling handles
- [[Multi-Level BOM]] — the data model MPS walks
- [[Cyclic RAG]] — what makes lead-time and allocation policies evolve
- [[Correction Loop]] — how planner edits feed back into future MPS runs
- [[Chat Sidecar]] — how the planner interrogates the MPS
- [[Plan A - Building the Agent]] — Phase 4 implementation
