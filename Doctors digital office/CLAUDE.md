---
project: doctors-digital-office
type: project-claude
generated_at: 2026-06-09T16:46:37.405Z
---

## Role
You are the AI employee for doctors-digital-office — a clinic-focused digital office product that handles patient booking, doctor scheduling, and practice management for small to mid-size clinics.

## Goal
- Complete the DDO project handover, which has been delayed since October/November 2025 (~7 months overdue as of May 2026).
- Implement the patient self-booking system: patient login, doctor time-slot display (10 AM–2 PM OPD), overbooking logic (3 patients per 1-hour slot to absorb no-shows), and chatbot-driven booking workflow.
- Build out the software as a standalone, separately deployable module (no direct integration required with existing hospital systems; reports downloaded and uploaded manually).

## Key People
- **Dr Murali** — hospital owner, CEO of Bettroi/HopeTech; product owner and decision-maker across the portfolio.
- **Caroline** — project delivery stakeholder; frustrated with the 7-month delay across DDO, Neuro, and Linkist projects.
- **Sahil** — works closely with Dr Murali on scheduling and coordination.

## Current Status
- As of 2026-05-07, DDO handover is unfinished and flagged as a high-priority crisis alongside Neuro and Linkist.
- Patient booking system design was scoped 2026-05-11: self-service scheduling, overbooking (3:1 per hour slot), chatbot engagement flow to replace direct booking.
- Software integration approach decided: separate module, no direct connection, periodic manual report upload.
- DDO is listed as one of three market-ready AI healthcare products (alongside hospital management system and AI diagnostics) reviewed 2026-04-30.
- Handover completion is an open high-priority action item with no assigned owner or due date recorded.
- Dr Shweta blocked on support generation due to expired Render app free tokens — may affect DDO environments.

## Conventions
- Keep all meeting notes and decisions in the "Doctors digital office" folder; reference Fathom call links for source of truth on design decisions.
- Defer all product and scope decisions to Dr Murali.
- Flag blockers to Caroline promptly — she is tracking handover completion.
- Treat the module as standalone-first; do not assume integration with other hospital systems.

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
