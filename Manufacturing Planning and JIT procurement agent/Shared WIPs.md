# Shared WIPs

> When multiple final products share upstream processes and intermediate WIPs. This is what makes real manufacturing hard, and what most demo-grade scheduling agents fail at.

## The Pattern (Three Industry Examples)

1. **Discrete (auto parts):** 12 final SKUs share the same SMT board-loading step. The shared output is a WIP "loaded PCB" that feeds 12 distinct downstream assembly lines.
2. **Batch (pharma):** one granulation run produces a base granulate that splits into 4 final SKUs (different bottle sizes, different labels).
3. **Process (steel):** one furnace heat produces a billet stream that splits downstream into rebar, wire rod, structural shapes.

In every case, the same WIP feeds multiple finals, with **different downstream lead times** per final and **different customer due dates** per order.

## Six Implications for the Agent

### 1. The BOM must be multi-level

Flat per-product BOMs hide shared WIPs. The agent needs a true DAG — see [[Multi-Level BOM]]. The customer's BOM master must reflect this; if their ERP only has flat BOMs, onboarding includes authoring the multi-level structure (most Indian SMBs need this).

### 2. Routings are graphs, not lists

Operations belong to **items** (intermediate or final), not to final products. The shared step is an operation that produces a WIP. The agent stores operations as DAG nodes and does a topological sort to schedule.

### 3. Demand aggregation at shared nodes

This is the headline advantage of multi-level BOMs. When scheduling the shared step, demand from all downstream consumers sums:

```
Total demand for WIP-5 this week
   = Σ over all parent products (parent_demand × consumption_ratio)
```

The agent runs *one* combined campaign of WIP-5 hitting MOQ/efficient-batch-size once, instead of three small batches. **This is the "lot-sizing for shared items" problem.**

### 4. JIT procurement math aggregates upstream

Raw material reorder doesn't sum per-product demand; it sums per-WIP demand recursively up to raw. With lesson-adjusted lead times (see [[Cyclic RAG]]), the formula becomes:

```
demand(raw)  = Σ over WIPs consuming raw (demand(WIP) × consumption_per_unit)
demand(WIP)  = Σ over items consuming WIP (demand(item) × consumption_per_unit)

ROP(raw) = (demand(raw) / horizon) × adjusted_lead_time + safety_stock
```

### 5. Allocation when supply < aggregate demand

When the shared WIP can't satisfy all downstream demand, the agent **allocates**. Example: 100 units of WIP-A, demands are 60 (Mahindra) + 50 (Tata) + 30 (Honda) = 140 total. Who gets cut?

The agent **never** invents an allocation policy. It executes the customer's policy as encoded in a [[Skills Vault]] entry:

```markdown
---
id: shared-wip-allocation-priority
domain: scheduling
---
## Rule
When a shared WIP is short, allocate in this order:
1. Tata (penalty contract — never short)
2. Mahindra (high-volume but tolerant up to 1 day slip)
3. Honda (lowest priority, slip up to 3 days OK)
4. Spot orders last
```

The [[Correction Loop]] refines this over time — *"actually for shared **paint**, Honda comes second because the paint shop won't requalify next month"* becomes a new [[Lesson]] that overrides the default for the paint WIP only.

### 6. Failure propagation across the tree

A quality reject at a shared upstream step affects **all** downstream products. The agent walks `where_used[item]` forward, computes per-downstream shortfall, identifies impacted WOs, generates options (delay / substitute / split-lot), and surfaces the cascade as a tree visualization in the approval UI.

```
REJECT at WIP-5 run #4471 → 200 units lost
├─ Order C (P3, due Day 20)   : shortfall 200 → DELAYS to Day 22
├─ Order A (P1, due Day 30)   : safe (uses next campaign)
└─ Order B (P2, due Day 35)   : safe
```

## Two Design Tensions

### Tension A — Lot-sizing vs JIT

- Shared WIPs benefit from *larger* runs (changeover amortization).
- JIT wants *smaller* lots (inventory minimization).
- Right answer is per-WIP: classify some shared WIPs as **campaign** (run weekly in large batches) and some as **pull** (run on demand).
- Classification is a [[Skills Vault]] entry, not code.

### Tension B — Pegging consistency under corrections

When a planner overrides a downstream allocation, the upstream plan was sized for the original allocation. The agent must **re-peg** and surface the second-order consequence:

> *"You moved 50 units of WIP-A from Mahindra to Tata. WIP-A run #4471 now has 50 surplus units. Cut the campaign, or hold the surplus as FG-buffer for next week?"*

This is one of the gnarliest parts of the system — handled by an explicit re-pegging step after every correction (see [[Plan A - Building the Agent]] Phase 4 step 11).

## How the Agent Handles It — Daily Loop

```
1. INGEST         : pull WOs, demand, inventory, machine states
2. EXPLODE        : multi-level BOM-explode → aggregate demand per item / time-bucket
3. NET            : subtract on-hand + on-order + already-planned production
4. RETRIEVE       : pull relevant skills + lessons for each scheduling decision point
5. SCHEDULE       : walk routing DAG bottom-up
                    - at each shared step: aggregate, apply lot-sizing skill, schedule
                    - if supply < demand: run allocation algorithm (skill-driven)
6. JIT TRIGGER    : for each raw < ROP, recommend PO (lesson-adjusted lead times)
7. PEG            : link every recommendation to upstream supply it depends on
8. PRESENT        : emit full plan + cascade map + every citation
9. AWAIT          : planner approves / edits
10. RECORD        : write episode + correction note (if edit happened)
11. RE-PEG        : if planner overrode, recompute pegging — surface upstream over/under-production
```

## What's Layered on Top of Classic MRP

MRP gives you BOM-explode and ROP math. The agent adds:

| MRP gives | Agent adds |
|---|---|
| Mechanical BOM-explode | Lesson-adjusted lead times in JIT math |
| Fixed allocation rules in code | Skills + lessons drive allocation, customer-specific, evolving |
| Black-box recommendations | Citations show which skill/lesson/episode drove each line |
| Static reorder formulas | Time-windowed retrieval (monsoon lesson applies Jun–Sep only) |
| Planner override = lost signal | [[Correction Note]] captures it; reflection promotes to [[Lesson]] |
| Failure → manual re-run | Auto-computed propagation cascade with citations |
| Lot-sizing = global parameter | Per-WIP campaign-vs-pull skill, planner-editable |

## See Also

- [[Multi-Level BOM]] — the data model that enables this
- [[Master Production Schedule]] — the time-phased plan that uses shared-WIP aggregation
- [[Correction Loop]] — how shared-WIP allocation policies evolve
- [[Cyclic RAG]] — how lesson-adjusted lead times propagate
- [[Skills Vault]] — where lot-sizing and allocation policies live
- [[Plan A - Building the Agent]] — Phases 3, 4, 5 implementation
