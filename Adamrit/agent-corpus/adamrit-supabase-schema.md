---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: draft
tags: [sop, adamrit, supabase, schema, data-model]
---

# Adamrit — Supabase Schema (Agent-Facing)

## How to read this note

Entity-level descriptions for grounding. No raw SQL. The authoritative SQL lives in `supabase/migrations/` of the adamrit repo (331 files). Generated TypeScript types live at `src/integrations/supabase/types.ts` — the structural truth for the running app.

For developer-side schema documentation including migration history, see the dev-reference [[Supabase-Schema]] in `Adamrit/` (one level up).

---

## Core entities

### `patients`
- The master patient record.
- Stores demographics, primary scheme (ESIC / CGHS / PMJAY / MJPJAY / corporate / private), ID-card numbers, contact, registration date.
- A single patient has many visits.

### `visits`
- One row per OPD or IPD encounter.
- Carries: patient ref, visit type (OPD/IPD), admission/discharge timestamps, room ref (for IPD), assigned doctor, scheme overrides, status.
- Billing fields were added directly to this table (migration `20250116140000`).
- A `condonation_delay_submission` flag tracks late insurance submissions (migration `20250117000000`).

### `diagnoses`
- Diagnosis catalog. Coded against ICD-10 ([[icd10-shortlist]]).

### `visit_diagnoses`
- Junction: which diagnoses apply to which visit. Captures both primary and secondary diagnoses, plus any complications.

### `visit_implants`
- Junction: implants used during a visit. Drives implant-line billing. (Migration `20250121_create_visit_implants_table`, rate-type fix on the same day.)

### `medications`
- Pharmacy master: drug name, form, strength, generic, default rate.

### `pharmacy_batches` (and related inventory tables)
- Per-batch stock with batch number + expiry + quantity. Dispensing decrements at this level. See [[adamrit-pharmacy-workflow]].

### `lab_tests` and lab configuration
- Lab catalog plus formula rules (e.g. iron-studies formula added in migration `20250124_add_iron_studies_formula`).

### `radiology_orders`
- Imaging requests linked to a visit.

### `bills` / `bill_items`
- Open and closed bills against visits. Line items capture service type, quantity, rate, scheme override.

### `advance_payments`
- Pre-bill advance receipts. Multiple advances allowed per visit.

### `financial_summary`
- Pre-computed summary row driving the final-bill financial-summary card. (Migration `20250120000000_create_financial_summary_table`.)

### `ledger` / `cash_book` / `day_book`
- Accounting tables. Posted from billing events and direct cash transactions.

### `bill_submissions`
- Queue for insurance / corporate claim submissions.

### `corporate_companies`, `corporate_areas`, `corporate_bulk_payments`
- B2B masters and bulk-payment ingestion records.

### `marketing_*`
- Marketing CRM tables — leads, field tracking, incentives.

### `tariff_*` (CGHS / Hope / Ayushman / PMJAY / MJPJAY)
- Scheme-specific tariff masters. Each scheme has its own rate file; selecting the wrong one silently produces wrong bills.

### `users` + RBAC
- Auth, roles, permissions. Surfaced via `usePermissions`.

### `agent_audit_log` (cross-cutting)
- Every agent action (e.g. pharmacy reorder PO drafts) writes a row here with the agent identity, action, vendor/qty, and the SOP version (`last_reviewed` date) the agent grounded on.

---

## Conventions agents should follow

1. **Always filter by tenant / hospital scope** if the table has one. RLS should enforce this, but never assume.
2. **Read from `financial_summary` for totals**, not by re-aggregating `bill_items` — the summary table is the source of truth for what the printed bill shows.
3. **Respect `condonation_delay_submission`** when reasoning about late insurance claims — it means the deadline has been formally extended.
4. **Treat `*_master` tables as read-only** unless you are explicitly the master-data agent.
5. **Match the patient's scheme to the right tariff master** when generating cost estimates. See [[adamrit-billing-workflow]] for the mapping.

## Related

- [[adamrit-system-overview]]
- [[adamrit-clinical-workflows]]
- [[adamrit-billing-workflow]]
- [[adamrit-pharmacy-workflow]]
- [[Supabase-Schema]] (developer-side reference)
