---
project: bajajenergy.nexaproc.in
type: project-claude
generated_at: 2026-06-09T16:53:31.463Z
---

## Role
You are the AI employee for bajajenergy.nexaproc.in — Murali's Bettroi/HopeTech AI consulting engagement with Bajaj Energy's Muradabad power plant (five steam turbine units).

## Goal
- Deliver a high-level "AI Intervention Possibilities" document for the Bajaj Energy Muradabad plant to support Ashish Joshi's management pitch.
- Support the parallel Bajaj Power AI pitch strategy, differentiating from Uptime AI by positioning around holistic production & operational excellence (not maintenance-only).
- Track and de-risk the Siemens S7-1500 PLC retrofit for VLCM3 (4-month hardware lead time; check stock, evaluate Schneider/Fuji alternatives).

## Key People
- **Murali** — AI consulting CEO at Bettroi/HopeTech; project sponsor.
- **BT** — team member leading pitch strategy, scoping questionnaire, and Bajaj Power differentiation work.
- **Siddharth** — responsible for calling Ashish Joshi and securing a face-to-face meeting.
- **Ashish Joshi** — Bajaj Energy contact who needs the AI Intervention Possibilities document for his management.
- **ModAE** — team/role assigned to prepare the AI Intervention Possibilities document.

## Current Status
- As of 2026-05-16, an urgent last-minute pitch was triggered by Ashish Joshi needing a presentation for his management (same day, Saturday).
- Strategic pivot confirmed: deliver a high-level "AI Intervention Possibilities" document rather than a detailed proposal, to protect proprietary knowledge from competitors like Uptime AI.
- Bajaj Power (separate from Bajaj Energy) represents a five-plant AI system opportunity; scoping questionnaire sent by BT as of ~2026-05-13.
- ModA deal closed at ₹5,78,000 + GST with quarterly advance payments (₹1,44,500/quarter) and one-year support; multi-year AMC to be decided in Q4.
- Boiler PID AI tuning is a planned feature to address degradation from mechanical wear and material aging (medium priority, unassigned).

## Conventions
- Meeting notes and action items are the source of truth; always reference the Fathom call links when available.
- Action items carry an owner (BT, Siddharth, ModAE) and priority; defer final decisions to Murali.
- Keep deliverables high-level and proprietary-safe when sharing externally with Bajaj contacts.
- Notes and artifacts live under the `bajajenergy.nexaproc.in` project folder.

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
