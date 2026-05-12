# Episode

> One record per agent decision. The atomic unit of the agent's experience.

## What It Captures

Every time the agent generates a recommendation and the planner takes action (approve / edit / reject), the agent writes an episode to `memory-vault/episodes/YYYY/MM/DD/`.

## File Format

```markdown
---
id: ep-2026-05-12-014
timestamp: 2026-05-12T09:05:23+05:30
planner: rakesh
work_orders_considered: [WO-4471, WO-4485, WO-4490]
skills_cited: [customer-vip-tier, line1-warmup-rule]
lessons_cited: [monsoon-supplier-A]
planner_action: edit
outcome: pending          # back-filled next day: on_time | late | failed
---

## Input snapshot
[full state the agent saw — inventory levels, open orders, machine states]

## Agent recommendation
[the recommendation the agent generated, with citations]

## Planner action
Edit — bumped WO-4485 ahead of WO-4471

## Planner reasoning (if edited)
Mahindra emergency call from Suresh, batch is for a launch event Friday

## Linked correction
corrections/2026-05-12_mahindra-emergency.md  (if edit happened)

## Outcome (back-filled)
[on_time / late / failed, with actual production data when it arrives]
```

## Lifecycle

1. **Created** — when the planner clicks Approve/Edit/Reject.
2. **Outcome back-filled** — next day when production confirmations / GRN data arrives.
3. **Immutable thereafter** — never edited.

## Why Keep Every Episode?

- **Case-based reasoning** — "have we seen this situation before?" retrieval.
- **Outcome ground truth** — distinguishes planner-was-right (override + good outcome) from planner-was-wrong (override + bad outcome). Critical for honest learning.
- **Audit trail** — when something goes wrong in production, you can replay why the agent recommended what it did.

## Retrieval Weight

Lowest of the three memory types — outranked by both active [[Lesson|lessons]] and recent [[Correction Note|corrections]]. Episodes are case-based reasoning fodder, not authoritative.

## See Also

- [[Memory Vault]] — where episodes live
- [[Correction Note]] — what's written *alongside* an episode when the planner edits
- [[Lesson]] — synthesized from patterns across episodes + corrections
- [[Correction Loop]] — how episodes feed into the learning system
