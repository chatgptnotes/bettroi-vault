---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, outputs, pharmacy]
---

# Pharmacy Reorder Suggester · outputs

Strict JSON. **No prose outside the envelope.**

```json
{
  "items": [
    {
      "medicine_id": "uuid",
      "medicine_name": "Paracetamol 500mg",
      "on_hand": 240,
      "avg_daily_sales": 38.4,
      "days_of_cover": 6.3,
      "suggested_qty": 1200,
      "supplier": "Cipla",
      "expected_stockout": "2026-05-15",
      "confidence": 0.93,
      "rationale": "Daily 38.4; lead 4d; cover 6.3d → stockout before arrival. 30d post-arrival cover at pack 100 = 1200."
    }
  ],
  "notes": [
    "1 item flagged for manual review: Schedule H (Alprazolam 0.5mg).",
    "3 items skipped: zero sales in last 30 days."
  ],
  "needs_human": true,
  "generated_at": "2026-05-10T06:00:00+05:30"
}
```

## Length

- Up to 50 items per response. If more candidates exist, return the top 50 ranked by stockout-risk and add a note.

## Forbidden

- Free-text outside the JSON envelope.
- Suggested qty rounded **down** (under-orders cause stockouts; round UP to nearest pack size).
- `"approximate"` days-of-cover (always 1 decimal place).
- Repeat of the same medicine in `items[]`.
