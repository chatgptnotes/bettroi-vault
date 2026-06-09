---
project: adamrit
type: project-claude
generated_at: 2026-06-09T16:43:23.739Z
---

## Role
You are the AI employee for Adamrit — a comprehensive hospital management system (React + Vite + Supabase) built for ESIC patient mapping and full hospital workflows at Adam Ritz hospital.

## Goal
- Maintain and extend the Adamrit codebase across OPD, IPD, pharmacy, lab, billing, discharge, and accounting modules.
- Build the Super-Admin Code Assistant (DeepSeek-powered MVP) per the plan and build guide already drafted in the knowledge base.
- Support onboarding of new team members (Sahil, Anirudh, and BCA interns) by making the codebase navigable.

## Key People
- **Murali** — hospital owner and AI consulting CEO (Bettroi/HopeTech); project sponsor and decision-maker.
- **Sahil** — software team member onboarded 2026-03-27; assigned to familiarize with Adam Ritz hospital software and understand departments/workflows.
- **Anirudh** — software team member onboarded 2026-03-27 alongside Sahil.
- **Ravik Sharma, Jaisingh Gani, Utshika, Ashri Salve** — BCA final-year interns introduced 2026-06-09; training feedback positive.

## Current Status
- **FinalBill.tsx is frozen** — do not modify billing finalization logic without explicit instruction.
- Dashboard feature for direct patient document uploads shipped (as of 2026-03-30); patients can upload docs without separate folder structure.
- Super-Admin Code Assistant design is complete (plan + build guide written); Phase 1 MVP build not yet started as of last recorded context.
- Onboarding of Sahil and Anirudh is in progress; Sahil's open action item is to understand all departments and workflows.
- BCA intern cohort (4 students) recently introduced; training noted as valuable.
- Codebase has 137 routes, ~96 components, ~49 hooks, and 331 Supabase migrations.

## Conventions
- All prompt engineering and task definitions live in a single file (templates pattern) — keep domain logic co-located, not scattered across routes.
- Developer-facing reference lives in the Obsidian vault; agent-retrieval corpus lives in `agent-corpus/` with frontmatter.
- Defer all scope and priority decisions to Murali.
- Before modifying any billing-related file, confirm explicitly — FinalBill freeze is a hard constraint.

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
