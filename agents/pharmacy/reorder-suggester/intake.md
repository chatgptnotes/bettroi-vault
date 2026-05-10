---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, intake, pharmacy]
---

# Pharmacy Reorder Suggester · intake

## Trigger

- Cron weekly Monday 06:00 IST.
- On-demand: `POST /functions/v1/agent-pharmacy-reorder` with optional `{"horizon_days": 30}`.

## Inputs (pre-assembled by the Edge Function)

- `inventory[]` — `{ medicine_id, medicine_name, on_hand, pack_size, supplier, schedule, last_received_at }`
- `sales_90d[]` — `{ medicine_id, total_qty, distinct_days }` aggregated from `medicine_sale_items`
- `lead_times` — `{ supplier_name → days }` map from `suppliers.lead_time_days`
- `horizon_days` — defaults to 30

## What "no sales in 30 days" means

The `sales_90d` aggregate covers 90 days. The agent must check whether sales in the most recent **30 days** are zero. If the recent window is empty, skip the SKU — the pharmacist can manually mark it critical-stock if needed.

## Out of scope

- Issuing the PO — the pharmacist confirms; PO generation is the existing `pharmacy-billing-service.ts` flow.
- Supplier negotiation.
- Drug substitution recommendations (different agent in a future phase).
