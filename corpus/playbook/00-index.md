---
department: general
agent_pack: ai-first-playbook
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, onboarding, ai-first, productized]
---

# Be AI-First Playbook — Index

**Purpose:** the productized version of the Be AI-First Framework. This folder is the source content for both (a) the Markdown playbook a client reads and (b) the interactive paid web tool that walks them through it.

## What this playbook gets a client to

A working **Business Brain** + **at least one production AI agent per department**, in 6–12 weeks, with measurable AI Leverage Ratio improvement quarter over quarter. Goal: 60–80% workflow automation.

## Files in this folder

| File | What it covers |
|---|---|
| `01-faqs.md` | Top 20 client questions with plain-English answers |
| `02-costs-and-timeline.md` | Indicative cost ranges (USD + INR) and time-to-set-up per package |
| `03-tools-and-subscriptions.md` | Every tool / SaaS / API the client signs up for, with monthly cost |
| `04-step-by-step.md` | The 10 sequential steps from Discovery to first agent live, with screenshot placeholders |
| `05-interactive-app-spec.md` | Engineering spec for the paid interactive web tool (Next.js + Supabase + Stripe) |
| `06-core-concepts.md` | The five vocabulary items every client must understand: Closed Loops, Business Brain, Test Harnesses, New Org Structures (IC/DRI/AI Founder), Token Maxing |
| `07-team-collaboration.md` | How the software team collaborates and delivers end to end: Slack rules, Google Doc master index, 4 PM pre-demo standup, file-access tiers, pulseofproject.com bug tracking, and the full delivery lifecycle (requirements sign-off, code review, QA gate, deploy/rollback, incidents, retrospective). Illustrated PDF in `assets/team-collaboration-sop.pdf`. |

**Related (outside this folder):**
- `corpus/personal-brain-pattern.md` — Matt Wolfe's Wiki + CRM + Journal pattern, adapted as an opt-in extension for individual users (founders, AI Champions). Distinct from the Business Brain — this is the *Personal* Brain.

## How a client moves through it

```
Pay setup fee → Unlock interactive playbook → Step 0 (Discovery) →
  Step 1–2 (Learn) → Step 3–4 (Wire) → Step 5–8 (Automate, per dept) →
  Step 9 (First agent live, confetti) → Step 10 (Scale retainer signed)
```

At any step the client can hit **"Talk to us"** to reach a HopeTech engineer in Slack Connect.

## Why this is in `corpus/` and not `agents/`

This is general knowledge that any agent (sales, onboarding, support) might need to ground on. It is not a single agent persona pack. The interactive tool itself can later be wired as an agent in `agents/onboarding/` once the prompt is stable.
