# Correction Note

> The atomic learning signal: written whenever the planner overrides the agent.

## What It Captures

The **delta** between what the agent recommended and what the planner actually did, plus the planner's *reason*.

## File Format

```markdown
---
id: corr-2026-05-12-001
episode_id: ep-2026-05-12-014
timestamp: 2026-05-12T09:06:11+05:30
planner: rakesh
tags: [supplier-unreliable, jit-procurement, monsoon]
skill_refs: [20-procurement-jit/supplier-lead-times]
---

## What I (agent) said
Order 500 units of 4mm steel from Supplier A (lowest cost, 7-day lead time quoted).

## What planner did
Ordered 300 units from Supplier A + 200 units from Supplier B (40% premium).

## Why (planner)
Supplier A missed last 3 deliveries during monsoon last year; B is dearer
but reliable. Splitting the order limits exposure.

## Suggested rule update
In monsoon months (Jun–Sep), penalize Supplier A's effective lead time by +4 days
when computing JIT trigger dates, and prefer split-sourcing.
```

## Lifecycle

1. **Written** the moment the planner clicks "Approve" after editing.
2. **Embedded** by the file watcher into the `corrections` Chroma collection.
3. **Immutable** thereafter.
4. **Promoted to a [[Lesson]]** when 3+ similar corrections accumulate (clustered by tag + embedding similarity).

## Why the "Why" Field Is Mandatory

This is the single most important UI design decision:

- A diff alone tells the agent *what* happened but not *why*.
- The "why" is what makes the correction generalizable to future situations.
- A correction without a why is noise; with one, it's signal.

UI enforces this — the **Approve** button is disabled until the why field has at least one sentence (or a tag from the predefined list).

## Tag Vocabulary (predefined)

The UI offers these tags to make corrections clusterable later:

- `wrong-priority`, `customer-VIP`, `customer-emergency`
- `supplier-unreliable`, `supplier-preferred`, `supplier-blocked`
- `machine-quirk`, `machine-warmup`, `machine-down`
- `traceability`, `compliance-hold`, `quality-hold`
- `seasonal`, `monsoon`, `festival`, `year-end`
- `utility-tariff`, `dg-set`, `effluent`
- `material-substitution`, `MOQ-violation`

Free-text is also allowed; tags help reflection cluster faster.

## Retrieval Weight

Higher than [[Episode|episodes]], lower than active [[Lesson|lessons]]. A recent correction (last 90 days) outranks a stale episode.

## See Also

- [[Correction Loop]] — the system this feeds into
- [[Lesson]] — what corrections become after 3+ accumulate
- [[Memory Vault]] — where corrections live
- [[Episode]] — the broader record this is linked to
