# Generic vs Vertical

> One codebase, many industries. The generic core stays vertical-agnostic; per-industry differentiation lives in a skill folder, not in the engine.

## The Design Pin

The agent has **one core**:
- LangGraph state machine
- Retrieval + reasoning + recommendation
- [[Correction Loop]] and reflection

The agent has **multiple personalities**:
- Discrete (auto parts, electronics, panel building)
- Batch (chemicals, food, pharma)
- Process / continuous (cement, steel, paper)

Each personality is just a different folder under `skills-vault/30-domain/` plus a different `SchedulingStrategy` plug-in.

## Why This Matters Commercially

- **Sell horizontally** — one product, every manufacturing customer is a target.
- **Differentiate vertically** — when you walk into a pharma customer, ship the `batch/` skill pack and they see a domain-aware agent on day one.
- **Don't fork the codebase** — every customer runs the same engine. Vertical = configuration, not code.

## What Changes Per Vertical

### Discrete Manufacturing

Skills pre-loaded in `skills-vault/30-domain/discrete/`:

- `kanban-pull-rules.md` — kanban-card semantics, work-in-progress caps
- `lot-traceability.md` — no-split rules for serialized parts
- `assembly-sequence.md` — dependency chains in BOM
- `due-date-prioritization.md` — EDD with critical-ratio tweaks
- `machine-cell-grouping.md` — work-center layout patterns

**Best fit:** auto parts, electronics, panel building, fabrication, machining job shops.

### Batch Manufacturing

Skills pre-loaded in `skills-vault/30-domain/batch/`:

- `recipe-management.md` — how recipes drive material consumption
- `campaign-batching.md` — minimum campaign sizes, grade transitions
- `changeover-matrix.md` — sequence-dependent setup times (e.g., light-then-dark)
- `expiry-fifo.md` — shelf-life-aware sequencing
- `cleaning-validation.md` — CIP/SIP rules between batches
- `regulatory-batch-records.md` — pharma 21-CFR-11 awareness

**Best fit:** chemicals, food, pharma, paints, cosmetics, specialty plastics.

### Process / Continuous Manufacturing

Skills pre-loaded in `skills-vault/30-domain/process/`:

- `bottleneck-protection.md` — TOC drum-buffer-rope
- `grade-transitions.md` — transition slope rules (cement clinker grades, paper basis weights)
- `utility-tariff-windows.md` — peak/off-peak load shifting
- `byproduct-jit.md` — JIT applies to consumables/reagents, not feedstock
- `yield-management.md` — variable yield by grade and conditions

**Best fit:** cement, steel, paper, glass, refineries, smelters.

## The Strategy Plug-in

```python
class SchedulingStrategy(Protocol):
    def rank_work_orders(self, wos: list[WorkOrder]) -> list[WorkOrder]: ...
    def compute_changeover_cost(self, from_wo: WorkOrder, to_wo: WorkOrder) -> float: ...
    def jit_trigger_offset(self, item: Item, supplier: Supplier) -> timedelta: ...


class DiscreteStrategy(SchedulingStrategy): ...
class BatchStrategy(SchedulingStrategy): ...
class ProcessStrategy(SchedulingStrategy): ...
```

The generic core calls `strategy.rank_work_orders(...)`. The strategy reads from the domain skills folder. Strategy is selected per deployment in `deployment.yaml`.

## Mixed / Hybrid Plants

Real factories often mix paradigms (e.g., a chemical plant with discrete packaging downstream). Handle this by:

1. Tag work centers with their paradigm: `wc-001 paradigm=batch`, `wc-101 paradigm=discrete`.
2. Strategy delegates per work center.
3. The cross-paradigm interface (batch output → discrete packaging) becomes its own skill: `30-domain/cross/batch-to-discrete-handoff.md`.

This is a Phase 7+ concern. Don't over-engineer it on Day 1.

## The Sales Pitch Variant Per Vertical

| Vertical | Lead with |
|---|---|
| Discrete | "Kanban that knows your VIP customers" |
| Batch | "Changeover scheduling that doesn't lose you a shift" |
| Process | "Bottleneck protection plus utility-tariff optimization" |

Same product. Different first-30-seconds.

## See Also

- [[Plan A - Building the Agent]] — Phase 7 (vertical hooks)
- [[Skills Vault]] — where the 30-domain folder lives
- [[Deployment Tiers]] — vertical packs ship at Bronze, not later
- [[Shared WIPs]] — how each vertical handles shared-process topology differently
- [[Master Production Schedule]] — backward-scheduling math is generic; per-vertical sequencing rules live in skills
