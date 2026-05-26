# Supabase Schema — Adamrit

## Source of truth

- **TypeScript types:** `/Users/apple/Desktop/adarith/adamrit/src/integrations/supabase/types.ts` — auto-generated from the live Supabase project. **This is the authoritative shape of every table.** Regenerate with `npm run generate-types` after each schema change.
- **SQL migrations:** `supabase/migrations/` (331 files) + `supabase-migrations/` (archive). The migration history is auditable but the cumulative effect may not match the migration filenames (drops, renames happen over time).
- **Client:** `src/integrations/supabase/client.ts`.

The tables below were extracted directly from `types.ts` (verified, not inferred).

---

## Tables by domain

### Patient core

| Table | Notes |
|---|---|
| `patients` | Master patient record. 30+ columns: name, age, gender, dob, contact, address, blood_group, allergies, corporate, insurance_person_no, identity_type, aadhar_passport, hospital_name, relationship_manager, emergency contacts |
| `patient_data` | Extended patient fields (separate table from `patients`) |
| `patient_documents` | Uploaded files attached to a patient |
| `patient_ledgers` | Per-patient running account |

### Visits (encounters)

| Table | Notes |
|---|---|
| `visits` | One row per OPD/IPD encounter. Carries `patient_id`, `visit_id`, `visit_type`, `admission_date`, `discharge_date`, `appointment_with`, `reason_for_visit`, `referring_doctor_id`, `diagnosis_id`, `treatment_type`, `package_amount`, `status`, plus billing fields (`bill_paid`, `billing_status`, `billing_sub_status`, `billing_executive`, `claim_id`, `final_bill_printed`), insurance fields (`esic_uh_id`, `cghs_code`, `condonation_delay_claim`, `condonation_delay_intimation`, `condonation_delay_submission`, `extension_of_stay`, `extension_taken`), discharge fields (`discharge_mode`, `discharge_notes`, `discharge_summary_signed`, `discharge_intimation_at`, `discharged_sr_no`), clearance flags (`nurse_clearance`, `pharmacy_clearance`, `gate_pass_generated`, `gate_pass_id`), and approvals (`additional_approvals`, `authorized_by`, `surgical_approval`, `intimation_done`, `delay_waiver_intimation`) |
| `gate_passes` + `generate_gate_pass_number` | Exit pass tracking and pass-number sequencer |
| `discharge_checklist` | Items to complete before discharge |

### Clinical data

| Table | Notes |
|---|---|
| `diagnoses` / `diagnosis_categories` | Diagnosis catalog |
| `complications` / `visit_complications` | Complications + per-visit junction |
| `visit_diagnoses` | Junction: visit × diagnoses |
| `visit_medical_data` | Captured clinical data per visit |
| `visit_consultants` / `visit_hope_consultants` / `visit_esic_surgeons` / `visit_hope_surgeons` / `visit_surgeons` / `visit_referees` | Doctor assignments per visit, split by scheme |
| `doctor_assignments` / `doctor_plan` | Care-team allocation |
| `referees` | Referring doctor master |
| `staff_members` | Staff master |
| `ai_clinical_recommendations` | LLM-generated clinical suggestions |

### Operation theatre / surgery

| Table | Notes |
|---|---|
| `operation_theatres` / `ot_patients` / `active_ot_patients` | OT scheduling |
| `pre_op_checklist` / `intra_op_notes` / `post_op_notes` / `post_surgical_consultations` | Surgery workflow notes |
| `surgical_treatments` / `surgical_billing` | Surgery line items + scheme billing |
| `visit_surgeries` | Visit × surgery junction |
| `cghs_surgery` / `esic_surgeons` / `hope_surgeons` / `hope_consultants` | Scheme-specific surgery + doctor masters |
| `nabh_rates` | NABH-accredited hospital rates |

### Lab

| Table | Notes |
|---|---|
| `lab` / `lab_orders` / `lab_worklists` / `worklist_items` | Lab orders and worklists |
| `lab_departments` / `lab_sub_speciality` / `lab_subspeciality` | Lab dept structure (note: both spellings present — likely a typo in one migration) |
| `lab_parameters` / `test_categories` / `test_panels` / `panel_tests` / `order_test_items` | Test catalog |
| `lab_samples` / `lab_reports` / `lab_results` / `test_results` | Sample and results data |
| `lab_equipment` / `external_labs` / `quality_controls` | Lab ops |
| `visit_labs` | Visit × lab order junction |

### Radiology

| Table | Notes |
|---|---|
| `radiology` / `radiology_orders` / `radiology_appointments` | Radiology workflow |
| `radiology_modalities` / `radiology_procedures` | Modality + procedure catalog |
| `radiology_reports` / `radiology_qa_checks` | Reports + QA |
| `radiologists` / `radiology_technologists` | Staff masters |
| `dicom_studies` | DICOM imaging study records |
| `radiation_dose_tracking` | Dose audit |
| `visit_radiology` | Visit × radiology order junction |

### Pharmacy / medicines

| Table | Notes |
|---|---|
| `medicines` | Drug master (plural — primary table) |
| `medication` | Singular variant — verify whether legacy or distinct; some hooks may reference it |
| `medicine_categories` / `medicine_manufacturers` | Drug taxonomy |
| `medicine_inventory` | Current stock per medicine |
| `medicine_sales` / `medicine_sale_items` | Pharmacy sales (header + lines) |
| `medicine_returns` / `medicine_return_items` | Pharmacy returns |
| `pharmacy_sales` | Separate pharmacy-side sales table |
| `prescriptions` / `prescription_items` | Doctor-written prescriptions |
| `visit_medications` | Visit × medication junction |
| `inventory_items` / `inventory_status` / `item_stock` | General inventory |
| `stock_movements` / `stock_transactions` | Stock ledger |

### Procurement

| Table | Notes |
|---|---|
| `purchase_orders` / `purchase_order_items` | PO header + line items |

### Billing

| Table | Notes |
|---|---|
| `bills` | Minimal: `bill_no`, `category`, `claim_id`, `patient_id`, `total_amount`, `status`, `date` |
| `bill_sections` / `bill_line_items` | Bill detail |
| `aging_snapshots` | Time-series aging buckets |
| `outstanding_invoices` | Unpaid invoices |

> The `financial_summary` table referenced in migration `20250120000000_create_financial_summary_table.sql` was **not present** in the current types.ts snapshot. It may have been dropped, renamed, or never reached production. Verify before relying on it.

### Accounting

| Table | Notes |
|---|---|
| `chart_of_accounts` | Account heads |
| `ledger_groups` / `ledgers` | Ledger structure |
| `vouchers` / `voucher_types` / `voucher_entries` | Voucher-based double-entry |
| `payment_allocations` / `payment_transactions` | Payment lifecycle |
| `daily_balances` | Day-end roll-ups |

### Resource & equipment

| Table | Notes |
|---|---|
| `equipment` | Asset master |
| `resource_allocations` / `resource_allocation_summary` | Bed/equipment allocation |

### System / audit

| Table | Notes |
|---|---|
| `audit_trail` | Cross-cutting change log |
| `workflow_transitions` | State-machine transitions |

---

## Notable observations

- **`bills` is much leaner than expected.** It's a header table (~10 columns); detail lives in `bill_line_items` and `bill_sections`.
- **`visits` is wide (~50 columns)** and carries billing/insurance/discharge state inline rather than in separate tables.
- **Pharmacy is bimodal** — both `medicine_sales` and `pharmacy_sales` exist. Confirm which the live app writes to before adding new logic.
- **Two lab subspeciality tables** — `lab_sub_speciality` and `lab_subspeciality`. Either a duplicate, a rename in progress, or one is unused. Flag before referencing.
- **`medication` (singular) vs `medicines` (plural)** — both exist. Likely a legacy table that hasn't been dropped.
- **No table named `pharmacy_batches`** — batch / expiry data likely lives on `medicine_inventory` rows, not a separate table.

## Conventions

- **Junction tables:** `visit_<thing>` pattern (`visit_diagnoses`, `visit_medications`, `visit_radiology`, `visit_labs`, `visit_surgeries`, …).
- **Doctor masters split by scheme:** `esic_surgeons`, `hope_surgeons`, `hope_consultants`. There's no single unified `doctors` table.
- **Audit trail:** `audit_trail` exists at the schema level — RLS / triggers may write to it.
- **Type regeneration:** `npm run generate-types` is **manual**, not automated. After any migration, regenerate and commit `types.ts` in the same PR.

---

## Quick lookups

To find a table's exact columns, search the types file:

```
grep -n "^      <table_name>: {" src/integrations/supabase/types.ts
```

Then read ~50 lines from that line number to see the `Row`, `Insert`, `Update`, and `Relationships` blocks.

## Related

- [[Architecture]] — how the app talks to the DB.
- [[Build-and-Deploy]] — `generate-types` script.
- [[adamrit-supabase-schema]] — agent-facing version with entity descriptions.
