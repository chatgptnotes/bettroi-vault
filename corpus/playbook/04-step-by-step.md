---
department: general
agent_pack: ai-first-playbook
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, step-by-step, onboarding, interactive]
---

# Be AI-First Playbook — 10 Sequential Steps

The full client journey from "I paid the setup fee" to "first AI agent live in production". Each step has: goal, action, screenshot placeholder, "done when…" criteria, and the FAQ that surfaces in the interactive tool.

> **Screenshot convention:** every `![alt](./screenshots/NN-name.png)` placeholder needs a real screenshot captured before the interactive tool ships. List of screenshots to capture is at the bottom of this file.

---

## Step 1 — Pay setup fee, unlock the playbook 🔓
**Phase:** Pre-Discovery · **Time:** 5 minutes

**Goal:** confirm intent and unlock the interactive tool.

**Actions:**
1. Click "Get Started" on hopetech.me/playbook.
2. Pay setup fee via Stripe (see `02-costs-and-timeline.md`).
3. Receive magic-link login email; tool unlocks.

![Step 1 — Stripe checkout + unlock screen](./screenshots/01-stripe-unlock.png)

**Done when:** dashboard shows 0/10 progress and the Step 2 card is unlocked.
**Confetti trigger:** YES — first unlock celebration.
**FAQ surfaced:** Q14 (cost), Q15 (ownership), Q16 (exit).

---

## Step 2 — Tool & workflow audit (Discovery part 1) 🔍
**Phase:** Step 0 Discovery · **Time:** 90 minutes self-serve + 60-min HopeTech call

**Goal:** complete tool inventory + top-10 workflow map.

**Actions:**
1. List every tool in use (CRM, email, PM, finance, HR, comms) — interactive form.
2. For each: monthly cost, active users, AI-readiness score (has API? Y/N).
3. Map top 5 workflows by **volume** + top 5 by **time cost**.
4. Mark each workflow: rule-based (automatable) vs judgement-required.

![Step 2 — Tool inventory form](./screenshots/02-tool-inventory.png)

**Done when:** ≥10 tools logged AND ≥10 workflows mapped.
**Confetti trigger:** YES.
**FAQ surfaced:** Q1, Q5, Q9.

---

## Step 3 — Identify AI Champions 👥
**Phase:** Step 0 Discovery · **Time:** 30 minutes

**Goal:** name 1–2 Champions per department.

**Actions:**
1. For each department, score AI literacy 0–5 (0 = never used AI, 5 = uses daily).
2. Nominate 1–2 Champions — *curious, not necessarily technical*.
3. Champions confirm by clicking acceptance link in email.

![Step 3 — Champion selection grid](./screenshots/03-champions.png)

**Done when:** every department has ≥1 confirmed Champion.
**Confetti trigger:** NO (small step).
**FAQ surfaced:** Q8.

---

## Step 4 — Champions begin daily Claude practice 🧠
**Phase:** Step 1 Learn (Weeks 1–2) · **Time:** 1 hour/day × 10 working days per Champion

**Goal:** Champions log 10+ hours of hands-on with Claude.ai or Claude Code on REAL work tasks.

**Actions:**
1. HopeTech sends Champions login + sector-specific prompt library.
2. Each Champion runs daily 1-hr session, logs 3 "aha moments" per week.
3. ironbark deployed in tenant — auto-captures reusable skills.
4. Weekly 30-min cross-dept share-back.

![Step 4 — Champion daily log + ironbark capture](./screenshots/04-champion-log.png)

**Done when:** every Champion has logged ≥10 hours AND ≥10 real tasks tested.
**Confetti trigger:** YES — milestone (Phase 1 complete).
**FAQ surfaced:** Q4, Q5, Q13.

---

## Step 5 — Migrate SOPs to Markdown 📝
**Phase:** Step 2 Wire (Weeks 3–5) · **Time:** 2–5 days (HopeTech engineers do the heavy lift)

**Goal:** convert SOPs, pricing, org chart, top-10 client questions into Markdown in the vault.

**Actions:**
1. HopeTech engineers receive existing docs (Word, PDF, Notion).
2. Convert + structure as Markdown with required frontmatter (`department`, `sensitivity`, etc. per `README.md`).
3. Drop into client's vault (`corpus/` and `agents/`).
4. Client reviews and approves in Obsidian.

![Step 5 — Vault folder tree in Obsidian](./screenshots/05-vault-obsidian.png)

**Done when:** every SOP exists as Markdown with valid frontmatter; no Word/PDF as primary source.
**Confetti trigger:** NO.
**FAQ surfaced:** Q7, Q10, Q12.

---

## Step 6 — Wire 3 live data sources 🔌
**Phase:** Step 2 Wire · **Time:** 3–5 days

**Goal:** connect CRM + Slack + Drive (or equivalents) to the agent layer.

**Actions:**
1. Generate API tokens for CRM (HubSpot/Zoho/Salesforce).
2. Wire Supabase Edge Function to pipe Slack channels into summarisation workflow.
3. Connect Google Drive / SharePoint via service account.
4. Test: ask the Business Brain "list our top 10 clients by revenue" — verify it pulls live.

![Step 6 — Integration dashboard, all 3 sources green](./screenshots/06-integrations.png)

**Done when:** ≥3 live data sources test green AND Company Context File approved by leadership.
**Confetti trigger:** YES — Business Brain is now LIVE.
**FAQ surfaced:** Q9, Q10.

---

## Step 7 — Ship first agent (Marketing OR Sales) 🤖
**Phase:** Step 3 Automate (Weeks 6–7) · **Time:** 1 week

**Goal:** one agent live in production with scoring checklist + closed-loop review.

**Actions:**
1. HopeTech ships first agent (e.g., Content Brief → Draft for marketing).
2. Wire scoring checklist (the agent's "good enough" definition).
3. Set quality threshold; below → loops back for revision.
4. Wire output into `#agents-output` Slack channel for daily skim.
5. Designate human reviewer for first 30 days.

![Step 7 — First agent shipping output into Slack](./screenshots/07-first-agent-slack.png)

**Done when:** agent has produced ≥5 outputs in production AND scoring checklist is filled out.
**Confetti trigger:** YES — *big* celebration. First production AI agent.
**FAQ surfaced:** Q3, Q11.

---

## Step 8 — Ship remaining departmental agents (Sales, Delivery, Finance) 🚀
**Phase:** Step 3 Automate (Weeks 7–10) · **Time:** 3 weeks

**Goal:** at least one live agent per department.

**Actions:**
1. Pattern-replicate Step 7 for the remaining departments.
2. Each agent gets its own scoring checklist.
3. AI Skills Library v1 — reusable prompts captured by ironbark, indexed.
4. Closed-loop review meeting put on the calendar (weekly, recurring).

![Step 8 — Department-by-department agent dashboard](./screenshots/08-all-agents.png)

**Done when:** Marketing + Sales + Delivery + Finance each have ≥1 live agent; all wired with scoring.
**Confetti trigger:** YES — Phase 3 complete.
**FAQ surfaced:** Q2, Q11.

---

## Step 9 — Intelligence layer goes live 📊
**Phase:** Step 4 Scale (Week 11) · **Time:** 1 week

**Goal:** daily intelligence brief replaces standup; AI Leverage Ratio dashboard online.

**Actions:**
1. Wire daily 8am AI-generated briefing → email or `#general` Slack.
2. Build AI Leverage Ratio dashboard (tasks completed / hours of human input).
3. Monthly leadership review on the calendar.
4. Quarterly 90-day before/after retro scheduled.

![Step 9 — AI Leverage Ratio dashboard](./screenshots/09-leverage-dashboard.png)

**Done when:** daily brief auto-sends for 5 consecutive days AND dashboard shows first ratio number.
**Confetti trigger:** YES — milestone (Phase 4 begins).
**FAQ surfaced:** Q18, Q19.

---

## Step 10 — Sign Scale Retainer + plan next 10 processes ♾️
**Phase:** Step 4 Scale (Week 12+) · **Time:** ongoing

**Goal:** lock in continuous expansion.

**Actions:**
1. Review AI Leverage Ratio after 4 weeks; project 2× → 5× trajectory.
2. Sign Scale Retainer (monthly).
3. Run Learn → Wire → Automate loop on the next 10 processes.
4. Update job descriptions to require AI fluency.

![Step 10 — Scale Retainer signed + next-10 backlog](./screenshots/10-scale-retainer.png)

**Done when:** retainer signed AND next 10 processes prioritised in backlog.
**Confetti trigger:** YES — full **AI-First Company** badge unlocked. Score: 100%.
**FAQ surfaced:** Q19, Q20.

---

## Stretch goals — beyond 100% (the "200% AI-Efficient" target)

Each unlocks +10% on the progress slider, capping at 200% ("AI-Native Operating System" badge).

| Stretch | Unlocks |
|---|---|
| Migrate to `claude-code-deepseek-backend` | +10% (Token-Max badge) |
| Hit AI Leverage Ratio ≥5× | +20% (Multiplier badge) |
| Open-source one of your agents back to ironbark | +10% (Contributor badge) |
| First quarter where headcount stayed flat AND output doubled | +30% (Scale Without Hiring badge) |
| Replace one C-suite weekly report with an AI brief | +10% (No-Middleware badge) |
| Land a client referral citing your AI fluency | +20% (Reference Customer badge) |

---

## Screenshots to capture before launch

The interactive tool needs all of these as 1920×1080 PNGs in `./screenshots/`:

- `01-stripe-unlock.png` — checkout + unlock screen
- `02-tool-inventory.png` — tool inventory form filled in
- `03-champions.png` — Champion selection grid
- `04-champion-log.png` — Champion daily log + ironbark skill capture
- `05-vault-obsidian.png` — Obsidian showing the vault folder tree
- `06-integrations.png` — integration dashboard, 3 sources green
- `07-first-agent-slack.png` — agent posting output into `#agents-output`
- `08-all-agents.png` — multi-department agent dashboard
- `09-leverage-dashboard.png` — AI Leverage Ratio chart
- `10-scale-retainer.png` — DocuSign + next-10 backlog

Capture from real client engagements (anonymised) where possible — the framework PDF is explicit that "every line is a live URL or public repo".
