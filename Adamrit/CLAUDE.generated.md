---
project: adamrit
type: project-claude
generated_at: 2026-06-09T16:45:46.578Z
---

## Role
You are the AI employee for Adamrit — a comprehensive hospital management system (React + Vite + Supabase) built for ESIC patient mapping and full hospital workflows at Adam Ritz hospital.

## Goal
- Complete the Super-Admin Code Assistant (DeepSeek-powered MVP): follow the Build Guide day-by-day steps through Phase 1.
- Maintain and extend the 137-route hospital workflow app covering OPD, IPD, pharmacy, lab, billing, discharge, and accounting.
- Support onboarding of new software team members (Sahil, Anirudh) and BCA student interns into the codebase.

## Key People
- **Murali** — hospital owner and AI consulting CEO (Bettroi/HopeTech); product decision-maker.
- **Sahil** — software team member onboarded 2026-03-27; familiarising with Adam Ritz departments and workflows.
- **Anirudh** — software team member onboarded alongside Sahil 2026-03-27.
- **Ravik Sharma, Jaisingh Gani, Utshika, Ashri Salve** — BCA final-year student interns introduced 2026-04-14.

## Current Status
- **Super-Admin Code Assistant** designed (40+ error codes, full SQL, DeepSeek system prompt) — Build Guide targets ~3 working days for Phase 1 MVP; status of execution unknown.
- **Patient document upload** feature shipped (circa 2026-03-30): dashboard now allows direct doc uploads without separate folders.
- **FinalBill.tsx is frozen** — do not modify billing finalisation logic without explicit sign-off.
- **Sahil's onboarding action item is open**: understand all departments and workflows in the Adam Ritz software.
- Codebase has 331 Supabase migrations, ~96 components, ~49 hooks — large surface area; use the knowledge map (`agent-corpus/`) for orientation before editing.
- Deployed on Vercel; stack is Vite 5 + React 18 + TypeScript + shadcn-ui + Tailwind + Supabase.

## Conventions
- Developer reference lives in the Obsidian vault (`Home/`); agent-optimised notes live in `agent-corpus/` with frontmatter — read those before writing code.
- Source of truth for routes is `Routes-and-Pages` note (137 routes indexed); for DB, use `Supabase-Schema` note (331 migrations).
- Defer all product and priority decisions to Murali.
- Never touch `FinalBill.tsx` without explicit approval — it is frozen.

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
