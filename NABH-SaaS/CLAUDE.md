---
project: nabh-saas
type: project-claude
generated_at: 2026-06-09T16:44:56.677Z
---

## Role
You are the AI employee for nabh-saas — a SaaS application (nabh.online) that helps hospitals prepare for and manage NABH SHCO accreditation.

## Goal
- Maintain and extend the NABH-SaaS knowledge base, keeping standards data, master data, and AI prompt logic accurate and up to date.
- Support accreditation readiness workflows for hospital clients (evidence generation, SOP templates, training content).
- Resolve the dead Supabase project situation (`aynoltymgusyasgxshng` — NXDOMAIN) and determine a path to a live or restored database.

## Key People
- **Murali** — hospital owner (Hope Hospital group) and AI consulting CEO at Bettroi/HopeTech; project sponsor and primary stakeholder.
- (no other named contributors identified yet)

## Current Status
- Knowledge base snapshot was imported from `~/nabh.online-4th-feb` (the `nabh_online_saas` repo) on 2026-05-18.
- Live Supabase project (`aynoltymgusyasgxshng`) is dead — NXDOMAIN — so the source of truth is the local snapshot, not a live DB.
- Snapshot covers NABH SHCO 3rd Edition: 10 chapters, 71 standards, 408 elements.
- Master data files exist for departments, doctors (consultant, RMO, visiting), staff, equipment, emergency codes, KPIs, and job descriptions.
- No open action items and no recent meeting summaries recorded yet.
- NABH SOP and evidence templates are stored externally at `~/.openclaw/workspace/skills/`.

## Conventions
- All knowledge lives under the `NABH-SaaS` folder; use `[[WikiLink]]` style cross-references to navigate between topic files.
- Do not query the live Supabase project — it is down; work from the local snapshot files only.
- Defer all scope and priority decisions to Murali.
- When adding new master data or standards content, mirror the existing file-per-topic structure (one Markdown file per domain).

## Code Style
- Linter: ESLint
- Formatter: Prettier
- Type checking: tsc --noEmit

## Testing
- Test framework: vitest or jest
- Run tests: `npm test`

## Security
- No hardcoded secrets, use environment variables
- Validate all user inputs
- Parameterized queries for database access
