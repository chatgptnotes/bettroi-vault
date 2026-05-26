---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, edge-function, deployment]
---

# Reorder Suggester — runtime implementation

The agent persona pack in this folder (`system-prompt.md`, `intake.md`, `outputs.md`, `boundaries.md`, `glossary.md`) defines **what the agent should do**.

The actual runtime is a Supabase Edge Function:

**`supabase/functions/pharmacy-reorder-scan/`**

It reads:
- **Live stock data** from Adamrit's Supabase (`medicines` table)
- **Grounding rules** from this folder + `corpus/pharmacy/inventory-management.md` + `corpus/pharmacy/reorder-thresholds.md`

And produces:
- A draft Purchase Order in Adamrit's `purchase_orders` table (when `DRY_RUN=false`)
- A Slack alert in `#pharmacy-alerts` for human approval
- An audit row in `agent_audit_log` tagged with the SOP version

See `supabase/functions/pharmacy-reorder-scan/README.md` for deploy + test instructions.

## When to update this agent's behaviour

Edit the SOP files (NOT the function code) for behaviour changes:

| Change | Where to edit |
|---|---|
| Reorder thresholds for a medicine | Adamrit `medicines.reorder_level` column |
| Which medicines count as "emergency" | `corpus/pharmacy/reorder-thresholds.md` |
| Vendor preferences / fallback supplier | `corpus/pharmacy/inventory-management.md` §3 |
| Approval gate rules (auto vs human) | `corpus/pharmacy/reorder-thresholds.md` |
| Slack channel | env var `SLACK_WEBHOOK_URL` (re-deploy) |
| Cron interval | re-deploy with `--schedule` flag |

The function reads its hardcoded heuristics today (v1). v2 will pull these SOPs from Storage at scan time and pass them to an LLM for per-case reasoning — at which point edits to `corpus/pharmacy/*.md` flow through to behaviour within ~12 minutes (vault → Supabase → Storage → Edge Function reads at next invocation).
