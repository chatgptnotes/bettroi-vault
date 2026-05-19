# Bettroi Marketing & Sales Automation Plan

**Owner:** Dr. Murali + Claude Code
**Goal:** Turn the brain from a *knowledge tool* into a *revenue tool* — every sales-relevant signal (Fathom call, calendar event, Slack thread) automatically produces CRM updates, drafted follow-ups, and marketing content.
**Started:** 2026-05-19
**Inputs available:** 13.8K brain_chunks · Fathom API · Google Calendar · Slack · Obsidian vault · Twilio WhatsApp · OpenAI + Anthropic

---

## Item Status Legend

- ✅ **done** — already in production
- 🔨 **building** — in progress this week
- 📋 **planned** — scheduled
- 💤 **backlog** — captured for later

---

## Sales (revenue-direct)

### S1 · Auto-CRM update from Fathom calls — 📋
After every Zoom call, brain extracts: company, attendees, deal-stage signal, next-step, decision-maker, blockers → writes to CRM.
- Today: no CRM is wired. First step is choosing the target (Pipedrive / HubSpot / Notion CRM / Airtable).
- Reuses: `fathom-sync.mjs`, `extract-action-items.mjs`, brain_chunks
- Effort: ~2 days
- Output: one CRM row updated per call, with provenance link to Fathom recording

### S2 · Proposal auto-generator — 📋
After a discovery call marked "send proposal", brain drafts a customized Google Doc proposal.
- Reuses: `extract-proposals.mjs`, `sync-proposifyai.mjs`
- Extends: pull industry-specific case studies from brain_chunks, pricing logic
- Effort: ~3 days
- Output: editable Google Doc in `Proposals/_drafts/`

### S3 · Meeting prep before every call — ✅ DONE
`calendar-prep-watcher.mjs` already fires 15-35 min before any external meeting and DMs the prep brief.

### S4 · Follow-up email drafter — 🔨 (extends existing)
After every Fathom call, draft the follow-up email in Gmail with what was actually said + clear next steps.
- Reuses: `email-drafts.mjs`, `fathom-sync.mjs`, `extract-action-items.mjs`
- Effort: ~2 days
- Output: Gmail draft addressed to attendees, ready to send

### S5 · Lost-deal post-mortem — 💤
When a deal closes-lost, AI scans all calls + threads → "you lost on price 3 of last 5 healthcare deals; competitor X mentioned twice"
- Depends on: S1 (CRM stage tracking)
- Effort: ~2 days

---

## Marketing (top-of-funnel)

### M1 · Case-study auto-draft — 📋
Every "closed-won" project → synthesize 1-page case study from Fathom + Obsidian project diary → drop in `_Marketing/case-studies/_drafts/`
- Depends on: S1 for the closed-won signal
- Effort: ~3 days

### M2 · LinkedIn post pipeline — 🔨
Daily: brain reads what was decided/learned (from daily-brief + weekly-review) → drafts 3 LinkedIn posts in Murali's voice → posts to `#review-content` Slack channel for selection.
- Reuses: `daily-brief.mjs`, `weekly-review.mjs`, voice signal from 13.8K chunks
- Effort: ~2 days
- Output: 3 daily post drafts in Slack `#review-content`

### M3 · Inbound lead enrichment — 💤
Every new lead → enrich via Clay/Apollo/Clearbit → brain scores fit against ICP → routes to right salesperson.
- Needs: enrichment API account (Apollo $99/mo or Clay)
- Effort: ~2 days after account exists

### M4 · Programmatic SEO pages — 💤
Generate landing pages for (vertical × use-case) combos from Be AI-First framework. e.g. "AI agents for hospitals", "AI agents for cement plants"
- Needs: confirmed target site (likely 2men.co), CMS or static gen
- Effort: ~5 days

### M5 · Competitor mention monitor — 🔨
Every Fathom call mentions of competitors (defined list) → logged with what was said. After 30 calls = real competitive intel doc.
- Reuses: existing brain_chunks, simple keyword + sentiment over content
- Effort: ~1 day
- Output: `_Marketing/competitor-intel.md` auto-refreshed weekly

---

## This week's build queue (in order)

1. **M5** Competitor mention monitor *(simplest, builds today)*
2. **S4** Follow-up email drafter *(extends `email-drafts.mjs`)*
3. **M2** LinkedIn post pipeline *(extends `daily-brief.mjs`)*
4. **S1** Auto-CRM update *(needs CRM choice — Murali to decide)*
5. **S2** Proposal generator *(extends `extract-proposals.mjs`)*
6. **M1** Case-study auto-draft *(depends on S1)*

---

## Open decisions needed from Murali

- **Which CRM?** (S1, M3, S5 all depend on this) — Pipedrive · HubSpot Free · Notion CRM · Airtable
- **LinkedIn posting** — fully automated, or human-in-loop review in Slack first? (M2)
- **Enrichment budget** — Apollo $99/mo is the cheapest credible option for M3
- **SEO target site** — 2men.co or new domain? (M4)

---

*Generated: 2026-05-19 | Next review: 2026-05-26 (after first 3 automations live)*
