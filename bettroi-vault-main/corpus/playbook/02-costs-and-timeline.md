---
department: general
agent_pack: ai-first-playbook
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, pricing, timeline, sales-enablement]
---

# Be AI-First Playbook — Costs & Timeline

Indicative ranges. Final pricing is fixed-scope and agreed in the Discovery Session. All ranges assume a **10-person client team** in India / UAE / Middle East.

> **Important:** these are HopeTech engagement fees only. Tool/SaaS subscriptions (Claude API, Supabase, etc.) are billed direct to the client and listed in `03-tools-and-subscriptions.md`.

---

## Engagement packages — at a glance

| Package | When | Time | Indicative range (USD) | Indicative range (INR) | Deliverable |
|---|---|---|---|---|---|
| **Discovery Sprint** | Week 0 | 90-min kickoff + 5 working days | $2,000 – $5,000 | ₹1.7L – ₹4.2L | Signed Capability & Readiness Report |
| **Learn + Wire Sprint** | Weeks 1–5 | 5 weeks | $8,000 – $20,000 | ₹6.7L – ₹17L | Working Business Brain + Capability Map + 3 live data connections |
| **Automate Sprint** | Weeks 6–10 | 5 weeks | $15,000 – $40,000 | ₹12.5L – ₹33L | 4–6 live agents (one per dept) + AI Skills Library v1 |
| **Scale Retainer** | Week 11+ | Monthly | $3,000 – $8,000 / month | ₹2.5L – ₹6.7L / month | Intelligence-layer dashboard, AI Leverage Ratio, quarterly agent audits, continuous expansion |

**Full first-year run (Discovery → end of Year 1):**
- Floor: ~$50,000 / ~₹42L
- Ceiling: ~$130,000 / ~₹108L
- Most clients land mid-range: ~$80,000 / ~₹67L

**Setup fee for unlocking the interactive playbook tool** (this product): **$500 – $1,500** (one-time). Credited against the Discovery Sprint if they convert within 30 days.

---

## Time-to-set-up at a glance

```
Week  0 ████ Discovery (5 days)
Week  1 ████ Learn — Champions begin daily Claude practice
Week  2 ████ Learn — Capability Map signed off
Week  3 ████ Wire — SOPs migrated to Markdown
Week  4 ████ Wire — first 3 live integrations (Supabase + CRM + Slack)
Week  5 ████ Wire — Company Context File approved → Business Brain LIVE
Week  6 ████ Automate — Marketing agent shipped
Week  7 ████ Automate — Sales agent shipped
Week  8 ████ Automate — Delivery / Ops agent shipped
Week  9 ████ Automate — Finance / Compliance agent shipped
Week 10 ████ Automate — All agents wired with scoring checklists + closed-loop review
Week 11 ████ Scale — Daily intelligence brief live; AI Leverage Ratio dashboard online
Week 12 ████ First quarterly retro scheduled
```

Conservative path (regulated industry / non-technical team): add 50%, so ~18 weeks to first full agent suite.
Aggressive path (small AI-fluent team, no compliance gates): compresses to ~8 weeks.

---

## What drives the range up vs down

**Up (closer to ceiling):**
- Regulated industry (healthcare, finance, legal) — DPA + audit work.
- More than 4 departments to automate.
- Custom agents needing domain training data.
- On-prem hosting requirement (vs Vercel + Supabase managed).
- Multi-language support (Arabic + Hindi + English, e.g.).

**Down (closer to floor):**
- Already on Slack + GitHub + Google Workspace.
- AI Champions already use Claude/ChatGPT daily.
- Low-volume CRM (no need for HubSpot Enterprise, etc.).
- Single-language, single-region.
- Willingness to use HopeTech's standardised stack (no bespoke).

---

## Ongoing operating cost (post-launch, monthly)

| Bucket | Range (USD/mo) | Notes |
|---|---|---|
| HopeTech Scale Retainer | $3,000 – $8,000 | See above |
| Tool subscriptions (per `03-tools-and-subscriptions.md`) | $500 – $1,500 | Slack Pro + Claude Team + Vercel Pro + Supabase Pro etc. |
| Claude API token spend | $200 – $2,000 | Scales with agent invocation volume |
| **Total ongoing** | **$3,700 – $11,500 / mo** | Or ₹3L – ₹9.5L / mo |

Optional **claude-code-deepseek-backend** migration cuts the API token spend by ~60–80% — worth it once monthly token spend exceeds $1,000.

---

## What to quote in a sales call

If asked "what does this cost?" cold:

> Discovery is the entry point — fixed-scope, around $3,000 USD for one week of work, you walk away with a signed Capability & Readiness Report whether you continue or not. After that, most clients run a Learn+Wire Sprint and an Automate Sprint over weeks 1–10, ending with at least one live agent per department. Total first-year investment for a 10-person team typically lands between $50,000 and $130,000 depending on regulation, scope, and how much we need to bespoke versus run off our standard stack. Want me to scope a Discovery for you?
