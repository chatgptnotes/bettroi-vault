---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, example, pharmacy]
---

# Example 01 · paracetamol vs cetirizine vs alprazolam

## Input

```json
{
  "inventory": [
    { "medicine_id": "uuid-1", "medicine_name": "Paracetamol 500mg", "on_hand": 240, "pack_size": 100, "supplier": "Cipla", "schedule": "G", "discontinued": false },
    { "medicine_id": "uuid-2", "medicine_name": "Alprazolam 0.5mg",  "on_hand":  80, "pack_size":  30, "supplier": "Sun Pharma", "schedule": "H", "discontinued": false },
    { "medicine_id": "uuid-3", "medicine_name": "Cetirizine 10mg",   "on_hand": 1200, "pack_size": 100, "supplier": "Cipla", "schedule": "G", "discontinued": false }
  ],
  "sales_90d": [
    { "medicine_id": "uuid-1", "total_qty": 3456, "distinct_days": 90 },
    { "medicine_id": "uuid-2", "total_qty":  270, "distinct_days": 60 },
    { "medicine_id": "uuid-3", "total_qty":  360, "distinct_days": 45 }
  ],
  "lead_times": { "Cipla": 4, "Sun Pharma": 7 },
  "horizon_days": 30
}
```

## Ideal output

```json
{
  "items": [
    {
      "medicine_id": "uuid-1",
      "medicine_name": "Paracetamol 500mg",
      "on_hand": 240,
      "avg_daily_sales": 38.4,
      "days_of_cover": 6.3,
      "suggested_qty": 1200,
      "supplier": "Cipla",
      "expected_stockout": "2026-05-16",
      "confidence": 0.93,
      "rationale": "Daily 38.4; lead 4d; cover 6.3d → stockout before arrival. 30d post-arrival cover at pack 100 = 1200."
    }
  ],
  "notes": [
    "1 item flagged for manual review: Schedule H (Alprazolam 0.5mg).",
    "Cetirizine skipped: 1200 on hand vs 4.0 daily = 300 days of cover, no action needed."
  ],
  "needs_human": true,
  "generated_at": "2026-05-10T06:00:00+05:30"
}
```

## Why this is correct

- Only the at-risk item (Paracetamol) appears in `items[]`. Cetirizine is healthy → skipped with a clear note.
- Schedule H Alprazolam is in `notes[]`, **not** `items[]` — the boundary rule is respected.
- All math is visible in `rationale`. A pharmacist verifies in 5 seconds.
- `suggested_qty` rounded UP to pack size (1200 = 12 packs of 100).
- `needs_human: true` because there's a Schedule-H flag in notes.
