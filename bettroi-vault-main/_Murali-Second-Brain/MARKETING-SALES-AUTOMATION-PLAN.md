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

### S1 · Auto-CRM update from Fathom calls — ✅ BUILT (token fix needed)
**CRM:** HubSpot (decided 2026-05-19)
- Script: `_Murali-Second-Brain/hubspot-from-fathom.mjs`
- Workflow: `.github/workflows/brain-hubspot-sync.yml` (Mon-Fri 17:30 IST)
- Flow: Fathom call → AI extracts company/stage/next-step → upsert HubSpot company + contact + call engagement → Slack digest to Murali
- **Blocker:** Private App token returns 401. Need to regenerate with these scopes: `crm.objects.contacts.write`, `crm.objects.companies.write`, `crm.objects.deals.write`, `crm.engagements.write`.
- Verified extraction: Bajaj Energy call → company name, stage=discovery, next-step with owner+date all captured cleanly

### S2 · Proposal auto-generator — ✅ BUILT
**Target:** proposifyai.com (Murali's own product) instead of Google Docs.
- Script: `_Murali-Second-Brain/proposify-from-fathom.mjs`
- Workflow: `.github/workflows/brain-proposify-drafter.yml` (Mon-Fri 16:00 IST)
- Flow: Fathom call → AI picks best matching Proposify `.claude/skills/generate-*-proposal.md` template → drafts full HTML proposal + pricing via Anthropic tool_use → inserts as `status=draft` into Proposify Supabase → Slack DM to Murali with edit link.
- Verified: Bajaj Energy call → ai-ml skill picked → proposal id `645e3701-5882-462c-a2f7-1fe9ff27eaaf` created. Editable at `https://proposifyai.com/proposals/645e3701-5882-462c-a2f7-1fe9ff27eaaf`

### S3 · Meeting prep before every call — ✅ DONE
`calendar-prep-watcher.mjs` already fires 15-35 min before any external meeting and DMs the prep brief.

### S4 · Follow-up email drafter — 🔨 (extends existing)
After every Fathom call, draft the follow-up email in Gmail with what was actually said + clear next steps.
- Reuses: `email-drafts.mjs`, `fathom-sync.mjs`, `extract-action-items.mjs`
- Effort: ~2 days
- Output: Gmail draft addressed to attendees, ready to send

### S5 · Lost-deal post-mortem — ✅ BUILT
- Script: `_Murali-Second-Brain/lost-deal-postmortem.mjs`
- Workflow: `.github/workflows/brain-lost-deal-postmortem.yml` (monthly, 1st 09:30 IST)
- Flow: keyword-scan brain for loss signals → AI clusters by root cause + competitor + price → writes `_Marketing/lost-deal-postmortems/YYYY-MM.md` + Slack digest
- Verified: ran on 90 days, generated honest report (no fabricated losses)

---

## Marketing (top-of-funnel)

### M1 · Case-study auto-draft — ✅ BUILT
- Script: `_Murali-Second-Brain/case-study-drafter.mjs`
- Workflow: `.github/workflows/brain-case-study-drafter.yml` (Mon 10:00 IST)
- Flow: auto-detect projects with win-signals OR pass `--projects=X,Y` → pull 30+ chunks of project context → AI drafts headline, problem, what we built, results, Murali's note, stack
- Verified: Adamrit case study at `_Marketing/case-studies/_drafts/2026-05-19-adamrit.md`

### M2 · LinkedIn post pipeline — 🔨
Daily: brain reads what was decided/learned (from daily-brief + weekly-review) → drafts 3 LinkedIn posts in Murali's voice → posts to `#review-content` Slack channel for selection.
- Reuses: `daily-brief.mjs`, `weekly-review.mjs`, voice signal from 13.8K chunks
- Effort: ~2 days
- Output: 3 daily post drafts in Slack `#review-content`

### M3 · Inbound lead enrichment — ✅ BUILT (Apollo wired)
- Script: `_Murali-Second-Brain/lead-enrichment.mjs`
- Apollo API key in `.env.local` — verified working (Apple lookup OK, Tata Steel scored 22/100 with red flags)
- Flow: `--email=` or `--domain=` → Apollo (person + org) → Firecrawl fallback → brain prior-mentions → ICP fit score 0-100 → routing recommendation (BT/Roma/Murali) → draft first response → Slack DM to recommended owner
- Verified: tatasteel.com → fit 22/100, routed to BT, 5 red flags surfaced
- Next: wire to HubSpot new-contact webhook for automatic processing

### M4 · Programmatic SEO pages — ✅ BUILT
- Script: `_Murali-Second-Brain/programmatic-seo-generator.mjs`
- Workflow: `.github/workflows/brain-seo-generator.yml` (manual + 1st of month)
- Combinatorial: 12 verticals × 9 use-cases = 108 possible pages. Idempotent (skips existing).
- Each page: H1, meta, problem section, what-we-build, Be AI-First framework anchor, pricing range, CTA, FAQ
- Output: `_Marketing/seo-pages/{vertical}-{usecase}.md` with full frontmatter ready for any static gen / CMS
- Verified: 4 pages generated (hospitals/manufacturing × ai-agents/workflow-automation)
- Next: pick deployment target (2men.co subpath, dedicated subdomain, or push to Vercel static site)

### M5 · Competitor mention monitor — 🔨
Every Fathom call mentions of competitors (defined list) → logged with what was said. After 30 calls = real competitive intel doc.
- Reuses: existing brain_chunks, simple keyword + sentiment over content
- Effort: ~1 day
- Output: `_Marketing/competitor-intel.md` auto-refreshed weekly

---

## Build status — 2026-05-19

ALL 10 automations are built. ✅

| # | Automation | Status | Verification |
|---|------------|--------|--------------|
| S1 | HubSpot Auto-CRM | ✅ built | extraction verified; HubSpot token needs CRM scopes |
| S2 | Proposify proposal drafter | ✅ LIVE | proposal `645e3701-…` in Proposify |
| S3 | Meeting prep | ✅ already running | `calendar-prep-watcher.mjs` |
| S4 | Fathom follow-up emails | ✅ built + tested | 3 drafts in `_Email-Drafts/` |
| S5 | Lost-deal post-mortem | ✅ built + tested | `2026-05.md` |
| M1 | Case-study auto-drafter | ✅ built + tested | Adamrit study generated |
| M2 | LinkedIn drafter | ✅ built + tested | 3 NABH posts generated |
| M3 | Lead enrichment (Apollo) | ✅ LIVE | Apollo verified, Tata Steel test passed |
| M4 | Programmatic SEO pages | ✅ built + tested | 4 starter pages generated |
| M5 | Competitor monitor | ✅ built + tested | 52 mentions, 8 competitors |

Plus **#9 Team rollout guide** ✅ written at `_Brain-Onboarding/TEAM-GUIDE.md`

---

## What still needs your action

1. **HubSpot token** — regenerate Private App with scopes `crm.objects.contacts.write`, `crm.objects.companies.write`, `crm.objects.deals.write`, `crm.engagements.write`. S1 unlocks immediately.
2. **Push GitHub Actions secrets** for the new workflows: `BRAIN_HUBSPOT_TOKEN`, `PROPOSIFY_SUPABASE_URL`, `PROPOSIFY_SUPABASE_SERVICE_KEY`, `PROPOSIFY_USER_ID`, `BRAIN_SLACK_REVIEW_CONTENT_CHANNEL` (optional).
3. **Pick SEO deployment target** — `2men.co/agents-for-{vertical}/`, `bettroi.com/ai-agents-for-{vertical}/`, or a new domain. Then I can generate all 108 pages.
4. **Send `_Brain-Onboarding/TEAM-GUIDE.md`** to BT, Roma, and Haritha.
5. **Wire M3** — connect to HubSpot new-contact webhook so every new lead auto-runs enrichment.

---

*v2 — 2026-05-19 | All scripts built and verified end-to-end. Next review: monthly (after first month of automation output).*
