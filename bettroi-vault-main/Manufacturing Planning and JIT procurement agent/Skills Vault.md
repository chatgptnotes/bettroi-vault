# Skills Vault

> The factory's **playbook** — human-curated rules of how this specific factory runs.

## Definition

The skills vault is a git-tracked Obsidian vault containing `.md` files, each one a rule the agent must follow. It is **read-only to the agent** — only humans (you + the planner) write to it.

## Structure

```
skills-vault/
├── 00-core/              ← agent charter, safety, decision checklist
├── 10-scheduling/        ← priority rules, bottleneck handling, changeover
├── 20-procurement-jit/   ← reorder logic, supplier policies, kanban, safety stock
├── 30-domain/
│   ├── discrete/         ← industry-specific (auto parts, electronics)
│   ├── batch/            ← industry-specific (chemicals, food, pharma)
│   └── process/          ← industry-specific (cement, steel, paper)
└── 40-templates/         ← templates for episodes, corrections, lessons
```

## File Format

Every skill file has YAML frontmatter:

```yaml
---
id: customer-vip-tier
domain: scheduling
applies_to: all
priority: high
last_reviewed: 2026-05-12
version: 1.2
---
```

Followed by markdown sections: `## Rule`, `## Why`, `## How to apply`.

## Three Layers of Skills

1. **Generic (you ship)** — universal mfg principles, ~15–20 files.
2. **Customer-specific (co-created Week 1–2)** — tribal knowledge from the planner workshop.
3. **Agent-grown** — actually these live in the [[Memory Vault]], not here. See [[Lesson]].

## Why Separated from [[Memory Vault]]

- The agent can never accidentally edit a rule.
- The vault is mounted **read-only** in Docker as a hard guarantee.
- Curated playbook vs append-only logbook are two different artifacts.

## See Also

- [[Memory Vault]] — the agent-written counterpart
- [[Plan A - Building the Agent]] — Phase 1 details
- [[Plan B - Data Sourcing]] — what skills to author per customer
- [[Generic vs Vertical]] — how the 30-domain folder enables vertical sales
- [[Shared WIPs]] — why shared-WIP allocation policies live here as skills
- [[Master Production Schedule]] — where lot-sizing and sequencing skills drive scheduling
- [[Chat Sidecar]] — Skill Author archetype helps planners write skills conversationally
