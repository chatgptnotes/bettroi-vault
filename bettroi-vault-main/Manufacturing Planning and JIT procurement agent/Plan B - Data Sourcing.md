# Plan B — Data & Skills Sourcing for the Mfg Agent

> **Reading order:** [[Primer]] → [[Plan A - Building the Agent]] → **Plan B** (this). Start at [[Home]].
> This plan answers: **when the agent is ready, what does a new customer need to give us, and where does it come from?**

## Context

You asked: *"if I go to an industry and sell them this agent, what kind of data and skills it needs to be given?"*

The agent built in [[Plan A - Building the Agent]] is **generic by design** — it ships with universal scheduling and JIT principles, but it knows nothing about *this specific factory* until the customer supplies:

1. **Factory state data** — master + transactional + (optionally) real-time.
2. **Tribal knowledge** — the planner's head-knowledge, externalized into [[Skills Vault]] files.
3. **Access** — credentials, file-shares, VPN, named users.

This document is the **intake checklist**, the **connector strategy**, and the **[[Deployment Tiers|deployment tiering]]** that the sales conversation references. Plan A's connector layer (Phase 3) is the engineering side; this plan is the customer-facing counterpart.

---

## Part 1 — Data the Customer Must Hand Over

### 1A. Master data (one-time export, ~1 day customer-side)

| Dataset | Why the agent needs it | Acceptable Day-1 format | If missing |
|---|---|---|---|
| **Item master** | Identify SKUs, units, ABC class | Excel: code, name, UoM, cost, class | **HARD BLOCKER** |
| **Bill of Materials (BOM)** | Explode demand → component needs | Excel: parent SKU, child SKU, qty per | **HARD BLOCKER** for JIT |
| **Supplier master** | JIT decisions, lead times | Excel: supplier, item, lead-time, MOQ, price, payment terms | **HARD BLOCKER** for procurement |
| **Routing / process plan** | Map work orders → machines | Excel: SKU, op-seq, machine, std time, setup time | Soft blocker — fake with single-stage |
| **Work center / machine master** | Capacity planning | Excel: machine, capacity/hr, shift pattern, OEE target | Soft blocker |
| **Calendar** | Shift / holiday awareness | Excel: date, shift, working/holiday | Soft blocker — defaults to 8hr × 6days |
| **Customer master** | VIP prioritization | Excel: customer, tier, payment terms | Nice-to-have |

### 1B. Transactional data (recurring feed — daily or weekly)

| Dataset | Frequency | Why it matters |
|---|---|---|
| Open work orders / production orders | Daily | The actual work to schedule |
| Sales orders / firm demand | Daily | Demand pull |
| Forecast (if any) | Weekly | Forward visibility for JIT |
| Inventory snapshot (raw + WIP + FG) | Daily, ideally twice | Reorder triggers, JIT math |
| Open POs + expected receipts | Daily | Avoid over-ordering |
| GRN log (goods receipts) | Daily | Actual supplier lead time vs promised — closes the loop |
| Production confirmation | Per shift | Actual output vs plan — agent's report card |
| Scrap / quality rejects | Per shift | Effective yield correction |

### 1C. Real-time / shop-floor (Tier 3 only — see [[Deployment Tiers]])

| Source | Stream | Use |
|---|---|---|
| MES / SCADA | Machine state (run/idle/down) | Reactive rescheduling on breakdown |
| MES / SCADA | Live OEE | Capacity-assumption confidence |
| PLC tags (Modbus / IEC61850) | Cycle counts | True throughput |

> **Reuse hook:** Plan A Phase 3's `MESAdapter` wraps your existing `gridvision-scada` `IEC61850Adapter` / `ModbusAdapter`. You don't rebuild protocol drivers — you wrap them.

---

## Part 2 — Where the Data Actually Lives (per ERP / system type)

For each common customer-side system, here is the **first-choice extraction method**, what to fall back to, and the failure mode.

### 2A. SAP (S/4HANA, ECC, B1)

| Layer | Primary | Fallback | Notes |
|---|---|---|---|
| Item master, BOM | OData service `MaterialMaster`, `BillOfMaterial` | Daily SAP query export to shared folder | Customer IT will resist API access — start with the scheduled export. |
| Open orders, inventory | OData `ProductionOrder`, `StockLevel` | Same — scheduled CSV | |
| Real-time | Webhooks via SAP Event Mesh (rare in SMB) | Polling every 15 min | Most plants don't have Event Mesh. |

### 2B. Oracle / Microsoft Dynamics

| Layer | Primary | Fallback |
|---|---|---|
| Master + transactional | REST APIs (Dynamics has good ones) | OData export jobs |
| Inventory | Direct DB read-only user | Scheduled export |

### 2C. Tally (the Indian SMB reality)

| Layer | Primary | Fallback |
|---|---|---|
| Everything | Tally XML over HTTP on port 9000 (Tally's built-in server) | Manual XML export by the accountant |
| Real-time | Polling Tally HTTP every 10 min | Daily Excel from the accounts team |

Tally is on most Indian SMB shop floors. The XML-over-HTTP is documented but undersold by Tally. Build this connector well — it's a competitive differentiator.

### 2D. Zoho Inventory / Books

| Layer | Primary | Fallback |
|---|---|---|
| Everything | Zoho REST API (well-documented, OAuth2) | CSV exports |

### 2E. Excel / Google Sheets / shared drives (always the baseline)

Every customer can do this. **Build this connector first, even for SAP customers** — it's the emergency fallback when IT denies API access.

| Mechanism | Implementation |
|---|---|
| Shared SMB folder (Windows) | `watchdog` library, file-arrival trigger |
| Google Sheets | `gspread` + service account |
| Email-drop | IMAP poll on a dedicated mailbox |
| SFTP drop | `paramiko` poll |

**Convention:** customer drops files matching `*_YYYYMMDD.xlsx` into a watched folder. Schema is documented in an Obsidian skill: `skills-vault/40-templates/excel-schema.md` — the customer's accountant can read it.

### 2F. MES / SCADA / PLC (Tier 3)

| Protocol | Adapter | Where it already exists |
|---|---|---|
| IEC 61850 | `IEC61850Adapter` | Reuse from `gridvision-scada/apps/server/src/protocol/` |
| Modbus TCP/RTU | `ModbusAdapter` | Same |
| DNP3 | `DNP3Adapter` | Same |
| OPC-UA | New — `OPCUAAdapter` via `asyncua` | Build new for v2 |

---

## Part 3 — Skills the Customer Must Co-Create

The [[Skills Vault]] has three layers. **You ship layer 1, you co-create layer 2 in week 1, layer 3 grows itself over months 2–6 via the [[Correction Loop]].**

### 3A. Layer 1 — Generic skills you ship (pre-loaded)

Already in `skills-vault/00-core/`, `10-scheduling/`, `20-procurement-jit/` per Plan A Phase 1. About **15–20 skill files**:

- Decision checklist, safety rules, agent charter
- Priority rules: EDD, SPT, critical ratio, slack-time-per-operation
- Generic JIT math: `ROP = avg_daily_demand × lead_time + safety_stock`
- Generic safety-stock formulas by ABC class
- Changeover minimization heuristics, SMED principles
- TOC drum-buffer-rope for bottleneck protection
- Universal anti-patterns: "never schedule below MOQ", "never split a traceability-critical lot"

**At this point the agent is a generic mfg consultant — useful but not differentiated.**

### 3B. Layer 2 — Customer-specific skills co-created in onboarding workshop (Week 1–2)

These are **interview-driven**. Sit next to the planner. One workshop day = ~10–15 skills authored.

Interview prompts the consultant should walk through:

| Skill bucket | Questions that pull the answer out |
|---|---|
| **VIP customers** | "Who can't wait? Who do you always say yes to even when it hurts?" |
| **Unreliable suppliers** | "Whose promise date do you secretly add 3 days to? Which supplier always slips in monsoon?" |
| **Seasonal patterns** | "What changes in monsoon / Diwali / March year-end / Eid / Pongal?" |
| **Machine quirks** | "Which machine has a 4hr warmup? Which one can't run on Sunday tariff? Which operator-machine combinations are required?" |
| **Changeover tribal rules** | "What sequence kills the day? What sequence saves it? What color/grade can never follow which?" |
| **Min/max batch** | "Below what qty do you not bother running? Above what qty do you split for handling?" |
| **Material substitution** | "When you're out of X, what do you use? When can you NOT substitute (customer spec, certificate, lot trace)?" |
| **Utility constraints** | "Which jobs only run on non-peak tariff? Diesel-genset rules? Water/effluent limits?" |
| **Quality holds** | "Which inspection step is non-negotiable? Which can be in-line vs offline?" |
| **Compliance** | "Any FDA / IATF / AS9100 / GST / pharma serialization rules that affect scheduling?" |

Skill file format (every entry):

```markdown
---
id: customer-vip-tier
domain: scheduling
applies_to: all
priority: high
last_reviewed: 2026-05-12
author: rakesh-shopfloor
---
## Rule
Tata Motors orders ship same-week regardless of cost.

## Why
35% of revenue, contractual penalty Rs 50K/day late.

## How to apply
- Bump Tata WO priority score by +100.
- Allow OT and changeover penalty.
- Never wait for full-truck consolidation on Tata lines.
```

**At this point the agent is your competitive moat for this specific customer.**

### 3C. Layer 3 — Skills the agent grows itself (the [[Cyclic RAG]] payoff)

You don't ask the customer for these. They emerge from the **[[Correction Note|correction]] → reflection → [[Lesson]]** pipeline built in Plan A Phase 5–6.

- Every planner override writes a **[[Correction Note]]**.
- Nightly reflection clusters corrections, drafts **[[Lesson|lesson]]** notes.
- Planner promotes draft → `status: active`.
- Lessons retrieved at higher weight than raw episodes.

By month 6, `memory-vault/lessons/` has **20–40 customer-owned, customer-specific rules** that nobody (including you) could have written on day 1. This is the lock-in.

---

## Part 4 — People & Access the Customer Must Commit

| Resource | Time | Critical because |
|---|---|---|
| **One named planner** (daily user) | 30 min/day, first 60 days | They are the correction signal. No planner = no learning. |
| **One IT person** | 4 hours over Week 1 | ERP creds, file-share paths, MES VPN |
| **One ops head** (escalation owner) | 1 hour/week | Authorizes controversial recommendations |
| **Read-only ERP user** | Provisioned by end of Week 1 | Or scheduled exports if API access is denied |
| **Shared folder** (SMB / NAS) | Same-day setup | Fallback connector when ERP API is blocked |

---

## Part 5 — Deployment Tiers

See **[[Deployment Tiers]]** for the full tier table and commercial model.

---

## Part 6 — What Kills a Deployment (have the awkward sales conversation early)

1. **No planner buy-in.** If the planner sees the agent as a threat, corrections won't be honest. **Sell to the planner first, not the MD.**
2. **No item master in any digital form.** Everything lives in a 30-year-old's WhatsApp and head. → Quote a separate "data foundation" engagement before the agent project even starts.
3. **Refusing read-only ERP access AND refusing scheduled exports.** Hard line: "either API or file-drop, pick one — without data the agent has nothing to reason about."
4. **Expecting Day-1 magic.** Agent is naive in Week 1 by design. Show the override-rate curve up front so the customer expects it to drop over weeks, not flatline at zero.
5. **Treating it as a forecasting tool.** It is a planning + procurement advisor, not a demand forecaster. If they want forecasting, scope it separately (Prophet / statsforecast / Croston for intermittent demand) as a plug-in strategy.

---

## Part 7 — The 60-Second Sales Pitch

> "Give us your item master, BOM, supplier list, and one planner for 30 minutes a day. Within a week the agent generates daily schedules and JIT purchase suggestions for the planner to approve or override. Every override teaches it your business. By month three it recommends what your best planner would, even when your best planner is on leave. By month six the institutional knowledge that used to walk out the door at 6pm lives in a vault you own."

---

## Verification — Customer Readiness Audit (run before signing)

Run this checklist before quoting a customer:

- [ ] Item master exists in digital form (any format)
- [ ] BOM exists in digital form
- [ ] Supplier list with lead times exists
- [ ] At least one planner is named and willing
- [ ] IT will give us either ERP read access or scheduled file exports (signed in writing)
- [ ] Ops head exists and has authorized the engagement
- [ ] One PC / VM on-prem available for the agent (minimum: 16GB RAM, 8 cores, GPU optional for Tier 1, recommended for Tier 2+)
- [ ] Outbound HTTPS to api.anthropic.com is permitted (for [[Hybrid LLM Routing|hybrid LLM]] hard-reasoning path)

**If any of items 1–3 is missing → quote a data-foundation pre-project (4–8 weeks) before the agent project.**

**If items 4–6 are missing → walk away. The deployment will fail.**
