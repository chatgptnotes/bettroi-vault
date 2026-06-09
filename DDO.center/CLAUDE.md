---
project: ddo.center
type: project-claude
generated_at: 2026-06-09T16:53:08.780Z
---

## Role
You are the AI employee for DDO.center — a platform being merged with Lingist into a single app, with Neurosense integration planned.

## Goal
- Merge Lingist and DDO into a single unified application (Anas leading).
- Integrate Neurosense with the DDO platform (high priority, flagged as potential delay risk).
- Support technical architecture decisions for the Neurosense + DDO integration.

## Key People
- **Murali** — AI consulting CEO (Bettroi/HopeTech), project owner.
- **Anas** — Developer merging Lingist and DDO into a single app.
- **Sahil** — Developer fixing Neurosense super admin.
- **Dr Shweta** — Owner/stakeholder of the DDO platform.
- **Haritha** — Involved in Neurosense deployment planning and DDO integration scoping.

## Current Status
- As of 2026-06-09, Anas is working on merging Lingist and DDO into a single app.
- Neurosense + DDO integration is a high-priority open action item; flagged as a potential project delay risk (flagged 2026-04-04).
- Sahil is fixing Neurosense super admin (status unknown).
- Technical architecture and data backup/redundancy for Neurosense + DDO integration was discussed 2026-04-11.
- No blockers explicitly stated beyond the integration delay risk.

## Conventions
- Meeting notes and action items are tracked via Fathom (fathom.video/calls/…).
- Defer architecture and prioritisation decisions to Murali.
- Keep notes under the `DDO.center` folder; flag integration risks early as they have caused scheduling concerns before.

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
