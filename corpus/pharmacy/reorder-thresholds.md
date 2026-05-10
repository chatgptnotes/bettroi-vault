---
department: pharmacy
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [sop, pharmacy, thresholds]
---

# Pharmacy reorder thresholds & policy

This file defines **when** the pharmacy team accepts an AI-suggested reorder vs. when a human must override. The reorder agent retrieves this as grounding context.

## Default thresholds

| Tier | When | Action |
|---|---|---|
| **Auto-suggest** | days-of-cover < 14 AND lead-time < days-of-cover | Agent ranks; pharmacist approves checkbox-style. |
| **Flag for review** | days-of-cover < lead-time (already-stockout-bound) | Pharmacist must confirm same-day. Cannot batch-approve. |
| **Manual only** | Schedule H/H1/X medications | Agent puts in `notes[]` — pharmacist creates PO via the existing manual flow. |
| **Skip** | No sales in last 30 days AND on-hand > 0 | Agent ignores. Pharmacist can mark "critical-stock" manually if a slow-mover is essential. |

## Special categories

### Cold-chain (insulin, biologics)
- Treat lead-time as `supplier.lead_time_days + 1` to absorb cold-chain transport.
- If `metadata.cold_chain = true`, the agent must include the +1 in the rationale.

### Emergency stock (epinephrine, naloxone, atropine)
- Never let days-of-cover go below 30, regardless of sales velocity.
- Pharmacist sets a `min_emergency_stock` override on these SKUs in the `medicines` table.

### ESIC vs OPD
- Same inventory pool — no separation at reorder time.
- ESIC dispensing rules affect billing, not stocking.

## Pack-size rounding

`suggested_qty` always rounds **up** to the nearest pack-size multiple. Under-orders cause stockouts; small over-orders are absorbed in the next month's sales.

Example: at avg-daily 38.4 with 4-day lead time and pack 100, the math says 30-day cover ≈ 1152. We round to **1200** (12 packs).

## Supplier policy

- Default to the existing supplier in `medicines.supplier`.
- If `supplier IS NULL`, the agent must mark it `null` in output — never substitute.
- For multi-supplier SKUs (rare), the pharmacist chooses at PO time.

## When to override the agent

- Brand swap requested by clinical (use a different generic supplier this month).
- Promotional / bulk-discount opportunity from a supplier.
- Anticipated event-driven spike (epidemic, surgery campaign) — pharmacist increases qty at PO time.
