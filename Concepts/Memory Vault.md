# Memory Vault

> The factory's **logbook** — what the agent decided, what the planner did, what we learned.

## Definition

The memory vault is a separate git-tracked Obsidian vault that the agent writes to. It is **append-mostly** — episodes are immutable once written; corrections are immutable; only lessons get edited (status transitions: `draft` → `active` → `dormant`).

## Structure

```
memory-vault/
├── episodes/
│   └── YYYY/MM/DD/
│       └── ep-2026-05-12-014.md     ← one per agent decision
├── corrections/
│   └── 2026-05-12_mahindra-emergency.md  ← one per planner override
└── lessons/
    ├── supplier-monsoon-reliability.md
    └── changeover-grade-transition.md
```

## What Lives Where

| Folder | What | Written by | Mutable? |
|---|---|---|---|
| `episodes/` | Every agent recommendation + planner action + outcome | Agent (after planner action) | Outcome field back-fills next day, otherwise immutable |
| `corrections/` | The diff between agent recommendation and planner edit, with the planner's "why" | Agent (right after planner clicks Approve/Edit) | Immutable |
| `lessons/` | Synthesized patterns from repeated corrections | Reflection job (Claude Sonnet draft) → planner promotes | Edited only via status transitions |

## Why Separated from [[Skills Vault]]

- Volume — memory grows fast (hundreds of episodes/month per plant). Skills are curated and small.
- Authorship — the agent writes here; humans write to skills.
- Lifecycle — episodes never get edited, skills get reviewed periodically.

## Retrieval Weight

When the agent retrieves context for a decision, items here are weighted as:

1. Active [[Lesson|lessons]] — highest weight
2. Recent [[Correction Note|corrections]] (last 90 days, similar tags)
3. Similar [[Episode|episodes]] from the past (case-based reasoning)

See [[Cyclic RAG]] for the timestamp-aware retrieval design.

## See Also

- [[Skills Vault]] — the human-curated counterpart
- [[Correction Loop]] — how memory accumulates and turns into knowledge
- [[Episode]], [[Correction Note]], [[Lesson]] — the three file types
- [[Chat Sidecar]] — the Historian and Vault Gardener archetypes make memory browseable conversationally
