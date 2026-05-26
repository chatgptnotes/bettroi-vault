# Supabase

#service #database

**Purpose:** Primary database, authentication, real-time subscriptions, and serverless edge functions for the entire adamrit system.

**Connected to:** [[Patient Management]], [[IPD]], [[OPD]], [[Lab]], [[Radiology]], [[Pharmacy]], [[Operation Theatre]], [[Billing]], [[Accounting]], [[Tally Integration]], [[Insurance]], [[Corporate]], [[Marketing]], [[Master Data]], [[Admin & Users]]

---

## Connection Details

| Property | Value |
|----------|-------|
| Project URL | `https://xvkxccqaopbnkvwgyfjv.supabase.co` |
| Client init | `src/integrations/supabase/client.ts` |
| Type definitions | `src/integrations/supabase/types.ts` |
| Env var (URL) | `VITE_SUPABASE_URL` |
| Env var (anon key) | `VITE_SUPABASE_ANON_KEY` |
| Env var (service key) | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Features Used

### PostgreSQL (150+ tables)
- Clinical tables: `patients`, `visits`, `visit_labs`, `lab_results`, `radiology_orders`, `discharge_summaries`
- Financial tables: `bills`, `bill_items`, `payment_transactions`, `patient_ledgers`
- Tally tables: `tally_ledgers`, `tally_vouchers`, `tally_sync_status`
- Pharmacy tables: `inventory_items`, `medicine_batch_inventory`, `purchase_orders`
- Master tables: `staff_members`, `medications`, `lab_tests`, `accommodations`

### Row-Level Security (RLS)
- Every table has `hospital_id` column
- RLS policies enforce per-hospital data isolation automatically
- No query needs manual hospital filtering — RLS handles it

### Authentication
- JWT-based auth
- User roles stored in `staff_members` table
- `AuthContext.tsx` wraps the entire app
- `HospitalSelection.tsx` sets active hospital on login

### Realtime Subscriptions
- Used for live updates in lab worklists, OT scheduling, queue displays
- Components subscribe to specific table changes via Supabase Realtime

### Edge Functions (`supabase/functions/`)
| Function | Purpose |
|----------|---------|
| `generate-letter/` | Auto-generate clinical letters |
| `refine-letter/` | AI-powered letter refinement |
| `send-admission-reminders/` | Scheduled WhatsApp reminders |
| `send-payment-alerts/` | Payment due notifications |
| `tally-proxy/` | Edge-function version of Tally XML proxy |
| `_shared/` | Shared utilities across edge functions |

---

## Database Table Groups

| Group | Tables |
|-------|--------|
| Clinical | `patients`, `visits`, `visit_labs`, `visit_radiology`, `visit_surgeries`, `visit_medications`, `discharge_summaries`, `lab_tests`, `lab_results`, `lab_orders`, `radiology_orders`, `radiology_reports` |
| Financial | `bills`, `bill_items`, `outstanding_invoices`, `payment_transactions`, `payment_allocations`, `patient_ledgers`, `chart_of_accounts`, `vouchers`, `voucher_entries` |
| Tally Sync | `tally_config`, `tally_ledgers`, `tally_groups`, `tally_vouchers`, `tally_stock_items`, `tally_sync_status`, `tally_sync_log`, `tally_import_log`, `tally_export_log` |
| Pharmacy | `inventory_items`, `medicine_master`, `medicine_batch_inventory`, `batch_stock_movements`, `purchase_orders`, `goods_received_notes`, `grn_items`, `suppliers` |
| Radiology | `radiology_modalities`, `radiology_procedures`, `dicom_studies`, `radiology_report_templates`, `radiation_dose_tracking` |
| Master | `staff_members`, `medications`, `lab_test_config`, `accommodations`, `equipment`, `operation_theatres` |
| Insurance | `yojana_mh_*` (15 tables), Ayushman/CGHS/ESIC doctor tables |
| Communication | `whatsapp_notifications`, `patient_call_records`, `ai_clinical_recommendations` |

---

## Migrations

Located in `supabase/migrations/` — 40+ SQL migration files tracking schema evolution.
