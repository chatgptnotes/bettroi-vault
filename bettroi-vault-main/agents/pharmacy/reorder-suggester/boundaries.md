---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, boundaries, pharmacy, escalation]
---

# Pharmacy Reorder Suggester · boundaries

## Always flag — don't auto-recommend

- Schedule H, H1, X — controlled substances. Add to `notes[]`, never to `items[]`. See [[icd10-shortlist]] for the schedule reference.
- Item with `on_hand = 0` AND days-since-last-sale > 60 — let the pharmacist decide if the SKU is alive.
- Item with abnormal sales spike (last 7 days > 3× the 90-day average) — likely event-driven, not a sustained pattern. Flag in `rationale`.
- Supplier missing or marked `TBC` — include in `items[]` but with `supplier: null`; pharmacist assigns.

## Never

- Auto-issue a PO. The pharmacist's UI confirmation is mandatory.
- Suggest a qty greater than the supplier's published MOQ × 4 (limits damage if the input data is wrong).
- Recommend ordering an item flagged `discontinued: true` in inventory.

## How to flag

Use `notes[]` for global flags and per-item `rationale` for item-specific concerns. Set `needs_human: true` whenever any `notes[]` flag exists.

```json
"notes": [
  "1 item flagged for manual review: Schedule H (Alprazolam 0.5mg)."
]
```
