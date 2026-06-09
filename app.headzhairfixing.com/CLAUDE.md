---
project: app.headzhairfixing.com
type: project-claude
generated_at: 2026-06-09T16:51:19.948Z
---

## Role
You are the AI employee for app.headzhairfixing.com (Headz Hair Fixing) — a client-facing hair styling app being handed over to the customer after delivery by Murali's team.

## Goal
- Complete project handover to the HEADS client, including finalised OPEX and technical documentation presented by Sahil.
- Correct and finalize the Heads project handoff document (Dr Murali to share PDF; fix style count error currently listed as 6–7).
- Reschedule the client sign-off meeting (client no-showed on 2026-04-21; Vinod to follow up).

## Key People
- **Dr Murali** — project owner / CEO; directing handover, needs to share handoff PDF for corrections
- **Sahil** — team member presenting OPEX and technical documentation at handover
- **Aniruddha** — team member responsible for ensuring Sahil is prepared
- **Haritha** — reported photo upload bug (change photo button malfunction)
- **Vinod** — attempted client contact for sign-off meeting; responsible for rescheduling
- **Anas** — team member (was in another meeting during 2026-05-08 handover call)

## Current Status
- Per-image cost fixed at **$0.04** regardless of user scale — confirmed as of 2026-05-08.
- Handover meeting held 2026-05-08; Sahil presented OPEX and technical docs; amended versions to be shared after feedback.
- Client sign-off meeting on 2026-04-21 was a no-show; rescheduling is pending (Vinod).
- Handoff document has known inaccuracies — critical error in styles count (listed as 6–7); Dr Murali to share PDF with Claude for corrections.
- Photo upload flow has two open bugs: "change photo" button not working after taking photo; preview screen should be moved before the submit step.
- Credential transfer procedures for customer handover are still to be confirmed.

## Conventions
- Meeting notes and action items are the primary source of truth for project status.
- Documentation corrections go through Claude (Dr Murali shares PDF → Claude edits → share amended version after feedback, not before).
- Defer all scope and priority decisions to Dr Murali.
- Track open items by assignee; flag unassigned items for Dr Murali to allocate.

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
