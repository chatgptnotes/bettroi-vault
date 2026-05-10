---
department: general
agent_pack: ai-first-playbook
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, tools, subscriptions, stack]
---

# Be AI-First Playbook — Tools & Subscriptions

Every tool a client signs up for during onboarding. Grouped by phase. Marked **REQUIRED** vs **RECOMMENDED** vs **OPTIONAL**.

All paid tools billed direct to the client account (HopeTech never holds client billing).

---

## Phase 0 — Discovery (Week 0)

| Tool | Required? | Cost (USD/mo) | Why |
|---|---|---|---|
| Google Workspace OR Microsoft 365 | REQUIRED | $6 – $22 / user | Email, Drive, Calendar — usually already in place |
| A note-taking app (Notion / Obsidian / Google Docs) | REQUIRED | $0 – $10 / user | To draft the Capability & Readiness Report |

---

## Phase 1 — Learn (Weeks 1–2)

| Tool | Required? | Cost | Why |
|---|---|---|---|
| **Claude Pro** (per Champion) | REQUIRED | $20 / user / mo | Daily hands-on practice on real tasks |
| **Claude Code** | REQUIRED for engineering Champions | Included with Claude Max ($100/mo) or API metered | Engineering-grade AI coding |
| Claude API key | REQUIRED (for ironbark + Wire phase) | Pay-as-you-go (~$50–$300/mo while learning) | Programmatic access |
| Loom or Vimeo | RECOMMENDED | $8–$15 / user / mo | Champions record "aha moment" demos for team share-back |

---

## Phase 2 — Wire (Weeks 3–5) — the Business Brain

| Tool | Required? | Cost | Why |
|---|---|---|---|
| **Obsidian** | REQUIRED | Free (Sync optional: $4/mo) | Markdown editor for the vault |
| **Obsidian Git plugin** | REQUIRED | Free | Auto-pushes vault to GitHub every 10 min |
| **GitHub Team or Enterprise** | REQUIRED | $4 – $21 / user / mo | Private repo for the vault + Actions for sync |
| **Supabase Pro** | REQUIRED | $25 / project / mo (plus usage) | Postgres + Auth + Storage; agent corpus DB |
| **Vercel Pro** | REQUIRED | $20 / user / mo | Hosting for agent UIs and webhooks |
| CRM (HubSpot / Zoho / Salesforce) | RECOMMENDED | $15 – $150 / user / mo | One of the 3 live data sources |
| **Slack Pro** | RECOMMENDED | $7.25 / user / mo (~₹600) | See `project_comms_decision.md` — 11 starter channels, agent surfaces, Slack Connect with clients |
| Make.com OR Zapier OR n8n | OPTIONAL | $20 – $80 / mo | No-code wiring of integrations |
| WhatsApp Business API (via Double Tick) | REGULATED INDUSTRIES | Variable | Patient/client real-time per `project_comms_decision.md` |

---

## Phase 3 — Automate (Weeks 6–10) — the agents

| Tool | Required? | Cost | Why |
|---|---|---|---|
| **Claude API** (production) | REQUIRED | $200 – $2,000 / mo at scale | Powers every agent invocation |
| **Sentry** | RECOMMENDED | $26+ / mo | Error tracking + alert routing into `#alerts-prod` |
| **Linear** OR GitHub Issues | RECOMMENDED | $0 – $10 / user / mo | Agent-readable task system |
| Stripe | OPTIONAL | 2.9% + 30¢ / txn | If shipping a paid product (the interactive playbook tool itself uses this) |
| `ironbark` (open source) | RECOMMENDED | Free | Skill harvester — github.com/chatgptnotes/ironbark |
| `claude-code-deepseek-backend` (open source) | OPTIONAL (cost reduction) | Free + DeepSeek API | Cuts inference cost ~60–80% — github.com/chatgptnotes/claude-code-deepseek-backend |

---

## Phase 4 — Scale (Week 11+) — the intelligence layer

| Tool | Required? | Cost | Why |
|---|---|---|---|
| Posthog OR Mixpanel | RECOMMENDED | $0 – $450 / mo | AI Leverage Ratio dashboard event source |
| Retool OR Streamlit | OPTIONAL | $10 – $50 / user / mo | Internal dashboards for non-engineer leadership |

---

## Tool stack at a glance — per-month cost for a 10-person AI-First team

| Item | Monthly cost (USD) |
|---|---|
| Google Workspace × 10 | $120 |
| Claude Pro × 4 Champions | $80 |
| Claude API (production agents) | $500 (mid-range) |
| GitHub Team × 10 | $40 |
| Supabase Pro | $25 |
| Vercel Pro × 3 devs | $60 |
| Slack Pro × 10 | $73 |
| HubSpot Starter × 5 sales | $75 |
| Sentry | $26 |
| Linear × 10 | $80 |
| **Total** | **~$1,080 / month** |

Add HopeTech Scale Retainer ($3k–$8k/mo) → all-in operating cost ~$4–$9k/month for a fully wired AI-First 10-person company.

---

## Single-source-of-truth rule

For each data type, exactly **one** tool is the canonical source. Document it in the Company Context File:

| Data type | Canonical source | Owner |
|---|---|---|
| Pricing | One markdown file in vault | Sales lead |
| Org chart | Notion page OR vault file | HR / Founder |
| Client list | CRM (HubSpot/Zoho/Salesforce) | Sales lead |
| Project status | Linear / GitHub Issues | Project lead |
| SOPs | Vault (`corpus/`) | AI Ops Lead |
| Decisions / ADRs | Vault (`decisions/`) | Founder / CTO |
| Patient records (healthcare) | EHR (NEVER vault) | Clinical lead |

When a duplicate appears, the non-canonical copy gets **deleted** (not just marked outdated). AI will use whatever it finds.
