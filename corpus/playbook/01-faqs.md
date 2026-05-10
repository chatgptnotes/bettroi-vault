---
department: general
agent_pack: ai-first-playbook
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, faq, sales-enablement]
---

# Be AI-First Playbook — FAQs

Twenty questions clients ask before, during, and after engagement. Plain-English answers. The interactive tool surfaces these contextually next to each step.

---

## Before you sign

**Q1 — What is "AI-First" actually?**
Your business runs on a Business Brain (your own SOPs, in plain text) plus AI agents that read it before answering. Goal: 60–80% of recurring workflows handled by AI; humans focus on judgment, exceptions, and customer relationships.

**Q2 — How is this different from "let's add ChatGPT to our team"?**
ChatGPT-the-chatbot is generic. The AI-First Framework gives the AI *your* rules, *your* pricing, *your* tone, *your* org chart — and wires it into the tools you already use (Slack, CRM, Drive). The AI stops making things up.

**Q3 — Will this replace my staff?**
No. It replaces *middle-management reporting* (status emails, weekly summaries, daily standups). Your people get those hours back to do the high-judgment work software can't do.

**Q4 — How long until we see results?**
- Week 0–2: AI Champions report 30+ minutes saved per task in their daily logs.
- Week 6: First production agent is live and shipping work in one department.
- Week 12: Daily intelligence brief replaces the morning standup; AI Leverage Ratio measurable.

**Q5 — What if our team is non-technical?**
The framework assumes that. Champions are "curious, not necessarily technical". HopeTech engineers do the wiring; your team writes notes in Markdown (which is just typing in plain text).

**Q6 — What if we're a regulated industry (healthcare, finance, legal)?**
HopeTech leadership includes a practising surgeon. We've shipped clinical-grade software (hopehospital.com, vivahgmc.com, Digihealthtwin, nabh.online). We never feed PHI/PII into external AI APIs without a Data Processing Agreement. Per-record consent gates are default-OFF.

**Q7 — What does "Business Brain" actually look like?**
A folder of plain-text Markdown files on your laptop, synced to GitHub privately, indexed into a database your agents read. No "AI black box" — you can open every file in Notepad. See `decisions/0001-obsidian-as-source-of-truth.md`.

---

## During the engagement

**Q8 — Who in our company needs to be involved?**
1–2 "AI Champions" per department (curious people, not necessarily technical). Leadership for ~2 hours/week of review meetings. One designated AI Ops Lead by Week 6.

**Q9 — Do we need to migrate off our current tools?**
No. We connect to what you already use (HubSpot/Zoho/Salesforce, Slack/Teams, Drive/SharePoint). The Business Brain is *additive*. We may flag tools as redundant during Discovery, but the call is yours.

**Q10 — Where does the data live?**
Your SOPs and rules live in a private GitHub repo + Supabase database (your tenant; we never co-mingle). Customer/patient data stays in its existing system. Combined only at agent runtime, never persisted together.

**Q11 — What happens if the AI gets something wrong?**
Every agent output passes through a scoring checklist before delivery. Below threshold = loops back for revision automatically. Customer-facing outputs go through a human reviewer until trust ≥9/10. Two independent kill switches let you stop AI features instantly.

**Q12 — Can we change how an agent behaves later?**
Yes — and without engineering. You edit a plain-text file in your vault. ~10–15 minutes later the agent reads the new version. No deploy, no PR, no waiting.

**Q13 — What is "ironbark"?**
HopeTech's open-source skill harvester (github.com/chatgptnotes/ironbark). Every time a Claude Code session in your tenant produces a useful prompt or workflow, ironbark captures it as a reusable skill. Your AI Skills Library grows automatically.

---

## Money, ownership, and exit

**Q14 — What does this cost?**
See `02-costs-and-timeline.md` for full ranges. TL;DR: Discovery Sprint is the entry point (~one week, fixed scope). After that you commit one sprint at a time.

**Q15 — Who owns the agents and the Business Brain?**
You do. Code is in your GitHub repo, data in your Supabase project, agents in your hosting account. HopeTech consults; we don't lock you in.

**Q16 — What if we want to leave after Sprint 1?**
You keep everything: the vault, the agents, the Skills Library, the integrations. We hand over docs and stop billing. Migration risk is near-zero because the stack is open (Markdown + Postgres + Next.js).

**Q17 — Are there ongoing per-token API costs?**
Yes — Claude API, embedding models, etc. Typical 10-person team: $200–$2000/month depending on agent volume. The Scale Retainer optionally moves you to `claude-code-deepseek-backend` for 60–80% inference cost reduction.

---

## Outcomes

**Q18 — How do we know it's working?**
The AI Leverage Ratio dashboard (live by Week 11): tasks completed per week ÷ hours of human input. Target trajectory: 2× → 5× → 10× over four quarters.

**Q19 — What happens after Week 11?**
Scale Retainer: monthly cadence. We run the Learn → Wire → Automate loop on the *next* 10 processes. Quarterly retro audits which agents are pulling weight and retires the ones that aren't.

**Q20 — Can we see this working somewhere before signing?**
Yes — the Portfolio Evidence section of the framework PDF lists 20+ live URLs and public repos: zeroriskagent.com, bni121.vercel.app, plcautopilot.com, drmhope.com, Linkist NFC, and others. Every URL on that list is a live deployment or public repo at github.com/chatgptnotes.

---

## How this file is used

- **Sales conversations:** quote answers verbatim.
- **Interactive tool:** each FAQ shows contextually next to the relevant step (e.g. Q11 next to the Automate step).
- **Onboarding agent:** future `agents/onboarding/` pack will load this file as primary context.
