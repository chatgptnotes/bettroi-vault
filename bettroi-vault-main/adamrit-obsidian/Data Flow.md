# Data Flow

#architecture

---

## 1. Clinical Workflow (Patient Journey)

```
Reception
  └─► Patient Registration  →  patients table (Supabase)
        └─► Visit Created   →  visits table
              ├─► Lab Order   →  visit_labs table
              │     └─► Results Entry  →  lab_results
              │           └─► WhatsApp to Doctor  ([[Twilio]])
              │
              ├─► Radiology Order  →  radiology_orders table
              │     └─► Report     →  radiology_reports
              │
              ├─► Pharmacy Prescription  →  visit_medications
              │     └─► Medicine Dispensed  →  inventory_items (stock deducted)
              │
              ├─► OT Scheduling  →  ot_notes, visit_surgeries
              │     └─► Implants Used  →  visit_implants
              │
              └─► Discharge
                    └─► Discharge Summary  →  discharge_summaries
                          └─► Final Bill Created  →  bills, bill_items
```

---

## 2. Financial Workflow (Billing to Accounting)

```
Bill Created (bills table)
  └─► Outstanding Invoice  →  outstanding_invoices table
        ├─► Payment Received  →  payment_transactions
        │     └─► Payment Allocated  →  payment_allocations
        │           └─► Patient Ledger Updated  →  patient_ledgers
        │
        ├─► Auto-push to Tally  →  tally-auto-push.ts service
        │     └─► XML Voucher Sent  →  api/tally-proxy
        │           └─► Tally Server Updated
        │                 └─► Sync Log  →  tally_sync_log
        │
        └─► Daily Reconciliation  →  daily_balances
              └─► Financial Summary  →  Dashboard
```

---

## 3. Tally Sync Workflow (Bidirectional)

```
PUSH (Supabase → Tally):
  Hospital transaction saved
    └─► tally-auto-push.ts triggered
          └─► Formats as Tally Voucher (XML)
                └─► POST to api/tally-proxy
                      └─► Tally server processes
                            └─► tally_sync_status updated

PULL (Tally → Supabase):
  Tally exports data (manual or scheduled)
    └─► tally-reverse-sync.ts runs
          └─► Ledgers, groups synced  →  tally_ledgers, tally_groups
                └─► Stock items synced  →  tally_stock_items
                      └─► tally_import_log updated
```

---

## 4. Communication Workflow (Notifications)

```
Event occurs (lab ready, payment due, admission reminder)
  ├─► Twilio WhatsApp  →  Patient/Doctor notified
  │     (via api/twilio-call.ts or edge function)
  │
  ├─► DoubleTick WhatsApp  →  Backup notification channel
  │
  └─► WhatsApp log  →  whatsapp_notifications table
```

---

## 5. AI Assistance Workflow

```
Doctor opens clinical form
  └─► OpenAI API called  →  api/ai-field-assistant.js
        └─► Recommendation returned
              └─► Stored  →  ai_clinical_recommendations table
                    └─► Doctor reviews and applies
```

---

## 6. Pharmacy Inventory Flow

```
Purchase Order Created  →  purchase_orders table
  └─► GRN (Goods Received)  →  goods_received_notes, grn_items
        └─► Batch Stock Added  →  medicine_batch_inventory
              └─► Stock Movements  →  batch_stock_movements
                    └─► Medicine Dispensed  →  stock decremented
                          └─► Low Stock Alert  →  UI warning
```

---

## See Also

- [[System Overview]] — architecture diagram
- [[Tally Integration]] — full Tally sync details
- [[Billing]] — financial module detail
- [[Pharmacy]] — inventory flow detail
