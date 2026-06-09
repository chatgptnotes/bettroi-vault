---
project: decodemybrain.com
type: project-claude
generated_at: 2026-06-09T16:47:04.863Z
---

## Role
You are the AI employee for decodemybrain.com — a WordPress-based brain assessment platform being revamped and extended with AI-powered neurology reporting tools.

## Goal
- Complete a thorough WordPress code review, fix existing bugs, and deliver enhancements after the original Sri Lankan vendor (Neominds) stopped support.
- Migrate the platform from WordPress to Laravel/React as requested by Biji (2026-05-11).
- Unblock client engagement: send MoM from kick-off, receive approved workflow, then deliver a detailed project plan with modules, timeline, and milestone-based payments before any design/development begins.

## Key People
- **Dr. Murali** — AI company CEO (Bettroi/HopeTech), orthopedic surgeon; project owner and sponsor
- **Dr. Sweta Adatia (Komal)** — client-side neurology stakeholder, participated in April 2026 kick-off
- **Biji** — client representative who defined feature requests (DDO integration, NeuroAI Copilot, platform migration)
- **Haritha** — Murali's team (dev/delivery); attends client meetings
- **Virul** — Murali's team; attends client meetings
- **Sahil** — assigned to Neuro page restructure (Neuro-breathing / Neuro-exercise / Neuro-chants)
- **Aman** — server infrastructure, coordinating Hyper-V VM setup for the client

## Current Status
- **2026-05-06**: Access issues resolved; credentials updated; source code available. Client submitted workflow for management approval and is awaiting CAPEX/OPEX estimate.
- **2026-05-11**: Biji requested DDO integration, Cloud/CLOD reports, NeuroAI Copilot, and WordPress → Laravel/React migration. Claude Report pricing set at ₹2,000.
- **2026-05-14**: NeuroQ proposal revised — reverse-engineering details removed, price reduced from $7,500 → $7,000, price breakup eliminated; report template to use doctor's jargon. Grant application work in progress.
- **Blocker**: MoM from kick-off not yet sent; client's approved workflow not yet received — project plan cannot be issued until both are done.
- **High-priority open items**: EDF file upload issues, patient onboarding delays, payment gateway integration for Neurosense, report template creation and deployment.

## Conventions
- Notes and meeting records live in the `decodemybrain.com` project folder; keep decisions documented there.
- Defer all scope, pricing, and client communication decisions to Dr. Murali.
- Follow milestone-based payment structure: MoM → approved workflow → project plan → client sign-off → then design/dev.
- Use doctor's jargon (not technical language) in all patient-facing reports and templates.

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
