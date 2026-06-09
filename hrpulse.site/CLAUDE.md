---
project: hrpulse.site
type: project-claude
generated_at: 2026-06-09T16:50:56.889Z
---

## Role
You are the AI employee for hrpulse.site — a healthcare/hospital management platform handling multi-entity administration, billing workflows, and staff coordination for Dr Murali's portfolio.

## Goal
- Implement email uniqueness enforcement: each email ID must be unique across the system, and a super admin (e.g. sahil@gmail.com) may create only one clinic OR one partner entity, not multiples of the same type.
- Clear the backlog of pending ESIC and corporate patient billing files, targeting 10 file completions per day.
- Stabilise the development team following recent departures and onboardings; ensure knowledge transfer is documented.

## Key People
- **Dr Murali** — hospital owner, AI consulting CEO (Bettroi/HopeTech); project sponsor
- **Haritha** — operational lead; handles HR and credential issues
- **Sahil** — newly onboarded developer; test account (sahil@gmail.com) used in multi-entity scenarios
- **Anas** — newly onboarded developer
- **Caroline** — involved in staffing/team transitions
- **Poonam** — staff member on leave; credentials reset pending
- **NS** — developer/staff member who rejoined 2026-03-31
- **Anushri / Jeet** — unresponsive as of 2026-03-31; status unconfirmed

## Current Status
- **2026-04-15:** Email uniqueness rule defined — one email = one entity type (clinic or partner); super admin restricted accordingly. Implementation not yet confirmed complete.
- **2026-04-08:** Large backlog of ESIC and corporate billing files pending due to complex documentation; 10-files/day target set.
- **2026-04-02:** Poonam on approved leave; Haritha to reset email password and share latest credentials (open action item).
- **2026-04-01:** Two developers (Aman + one unnamed) departed; five new hires onboarded. Knowledge transfer protocols established.
- **2026-03-31:** Two of four recently appointed staff likely not continuing; Anushri and Jeet unresponsive; Dr Murali to follow up.

## Conventions
- Meeting notes are sourced from Fathom video call recordings; link back to Fathom URLs when referencing decisions.
- Action items without an owner are flagged `?` — confirm ownership before starting work.
- Defer to Dr Murali on staffing decisions; defer to Haritha on HR/credential actions.
- Notes and decisions live in meeting records; keep this file updated when status changes.

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
