# Lesson

> A pattern synthesized from 3+ similar [[Correction Note|corrections]], promoted by the planner, retrieved at the highest weight by the agent.

## What It Is

A lesson is the **promoted form** of a correction pattern. It's the agent's most valuable knowledge — proven by repeated planner overrides and explicitly endorsed by a human.

## How It's Born

1. Nightly reflection job reads last 7/30/90 days of corrections.
2. Clusters them by tags + embedding similarity (HDBSCAN).
3. For each cluster with **N ≥ 3** corrections, sends the cluster to Claude Sonnet with: *"these 3+ corrections share a pattern. Write a single rule that captures the underlying lesson."*
4. Writes draft to `memory-vault/lessons/<topic>.md` with `status: draft`.
5. Planner sees draft in the UI's "Lessons to review" tab.
6. Planner edits if needed, then clicks **Promote**. Status flips to `active`.

## File Format

```markdown
---
id: lesson-supplier-monsoon-reliability
status: active          # draft | active | dormant
created: 2026-08-12
promoted: 2026-08-13
last_applied: 2026-09-04
applications: 14
source_corrections: [corr-2026-05-12-001, corr-2026-06-03-007, corr-2026-07-21-003]
tags: [supplier-unreliable, monsoon, jit-procurement]
confidence_decay_days: 90
---

## Rule
In monsoon months (Jun–Sep), treat Supplier A's quoted lead time as +4 days
when computing JIT trigger dates. Prefer split-sourcing (60% A + 40% reliable
alternative) for any 4mm steel order during these months.

## Why
Supplier A has missed delivery in 3 of 4 monsoon orders historically. Reliable
alternatives are 30–40% dearer but eliminate slip risk.

## How to apply
- For materials sourced from Supplier A: inflate lead time by 4 days in JIT
  math during Jun–Sep.
- Recommend split orders when total qty > MOQ × 2.
- Always cite this lesson when recommending against the lowest-cost supplier.

## Source corrections
- corr-2026-05-12-001 (mahindra steel, monsoon, split-sourced)
- corr-2026-06-03-007 (general steel, monsoon, switched to B entirely)
- corr-2026-07-21-003 (specialty grade, monsoon, accepted delay penalty)
```

## Status Transitions

```
   draft ──promote──► active ──no use for 90 days──► dormant
     │                  │                              │
     │                  └──── still applied ───────────┘
     │                                                 │
     └────── planner rejects ─────► archived           │
                                                       ▼
                                              planner reviews,
                                              promotes back to active
                                              or archives
```

## Anti-Drift Guardrail

Every active lesson has a `confidence_decay_days` (default 90). If `last_applied` hasn't updated in that window, the lesson auto-demotes to `dormant` and surfaces for planner review. Prevents lesson rot.

## Retrieval Weight

**Highest** of the three memory types. An active lesson outranks:
- A [[Skills Vault]] entry on the same topic
- A recent [[Correction Note]]
- A similar [[Episode]]

When an active lesson is retrieved, the agent **must** cite it in its recommendation.

## Why Promotion Matters

Lessons are the **only** part of the [[Memory Vault]] that mutates agent behavior automatically. Auto-promoting without a human creates drift risk. The planner promotion step is the human-in-the-loop safety check.

## See Also

- [[Correction Note]] — the raw material lessons are synthesized from
- [[Correction Loop]] — the full pipeline
- [[Memory Vault]] — where lessons live
- [[Cyclic RAG]] — the timestamp-aware retrieval that gives lessons their power
- [[Chat Sidecar]] — Lesson Curator archetype helps planners promote drafts conversationally
- [[Master Production Schedule]] — lessons mutate backward-scheduling lead times and allocation
