---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: approved
tags: [sop, adamrit, supabase, schema, data-model]
---

# Adamrit — Supabase Schema (Agent-Facing)

## How to read this note

Entity descriptions for retrieval grounding. **Table and column names below were verified against `src/integrations/supabase/types.ts`** (the auto-generated TypeScript schema, which mirrors the live Supabase project). Developer-side reference with full table inventory is in [[Supabase-Schema]] one folder up.

Agents should treat this note as the canonical entity glossary for Adamrit data.

---

## Core entities

### `patients`
The master patient record. ~30 columns. Identifies the human across visits.

**Key fields:** `id`, `name`, `age`, `gender`, `date_of_birth`, `blood_group`, `allergies`, `phone`, `address`, `aadhar_passport`, `identity_type`, `insurance_person_no`, `corporate`, `hospital_name`, `relationship_manager`, two emergency-contact pairs.

There is also a separate `patient_data` table for extended fields, `patient_documents` for uploaded files, and `patient_ledgers` for a per-patient running account.

### `visits`
One row per OPD or IPD encounter. **The wide central table — ~50 columns.** All billing, clinical, and discharge state for a single encounter lives here.

**Identification & dates:** `id` (uuid), `visit_id` (string), `patient_id` (FK to `patients`), `visit_type` (OPD/IPD), `visit_date`, `admission_date`, `discharge_date`, `surgery_date`.

**Clinical:** `appointment_with`, `reason_for_visit`, `referring_doctor_id`, `diagnosis_id`, `treatment_type`, `package_amount`.

**Billing:** `bill_paid`, `billing_status`, `billing_sub_status`, `billing_executive`, `claim_id`, `final_bill_printed`.

**Insurance / scheme:** `cghs_code`, `esic_uh_id`, `condonation_delay_claim`, `condonation_delay_intimation`, `condonation_delay_submission`, `delay_waiver_intimation`, `extension_of_stay`, `extension_taken`, `intimation_done`, `surgical_approval`, `additional_approvals`, `authorized_by`, `relation_with_employee`, `sst_treatment`.

**Discharge & clearance:** `discharge_mode`, `discharge_notes`, `discharge_summary_signed`, `discharge_intimation_at`, `discharged_sr_no`, `nurse_clearance`, `pharmacy_clearance`, `gate_pass_generated`, `gate_pass_id`, `file_status`.

**Other:** `sr_no`, `bunch_no`, `remark1`, `remark2`, `thumb_registration_no`, `status`.

When an agent reasons about a single hospital encounter, it should start with the `visits` row and join out from there.

### Junction tables (visit × X)

Every clinical / billing artifact attached to a visit goes through a junction table:

- `visit_diagnoses` — diagnoses attached to this visit
- `visit_complications` — complications observed
- `visit_consultants` / `visit_hope_consultants` — consultants seen
- `visit_surgeons` / `visit_hope_surgeons` / `visit_esic_surgeons` — surgeons assigned
- `visit_referees` — referees
- `visit_medical_data` — captured clinical data
- `visit_medications` — prescribed/dispensed meds
- `visit_labs` — lab orders
- `visit_radiology` — imaging orders
- `visit_surgeries` — surgeries performed

### Clinical masters

- `diagnoses` (+ `diagnosis_categories`) — diagnosis catalog
- `complications` — complications catalog
- `referees`, `staff_members` — doctor / staff masters
- `cghs_surgery`, `esic_surgeons`, `hope_surgeons`, `hope_consultants` — **scheme-specific masters** (one per scheme; no unified doctors table)
- `nabh_rates` — NABH-accredited hospital rate cards
- `ai_clinical_recommendations` — LLM-generated suggestions stored for review

### Operation theatre

- `operation_theatres`, `ot_patients`, `active_ot_patients` — scheduling
- `pre_op_checklist`, `intra_op_notes`, `post_op_notes`, `post_surgical_consultations` — surgery notes
- `surgical_treatments`, `surgical_billing` — surgery line items + scheme billing

### Lab

- `lab`, `lab_orders`, `lab_worklists`, `worklist_items` — orders + worklists
- `lab_departments`, `lab_sub_speciality` (note: also a duplicate-spelled `lab_subspeciality`)
- `lab_parameters`, `test_categories`, `test_panels`, `panel_tests`, `order_test_items` — test catalog
- `lab_samples`, `lab_reports`, `lab_results`, `test_results` — execution
- `lab_equipment`, `external_labs`, `quality_controls` — operations

### Radiology

- `radiology`, `radiology_orders`, `radiology_appointments` — orders
- `radiology_modalities`, `radiology_procedures` — catalog
- `radiology_reports`, `radiology_qa_checks` — output + QA
- `radiologists`, `radiology_technologists` — staff
- `dicom_studies` — DICOM imaging studies
- `radiation_dose_tracking` — dose audit log

### Pharmacy

- `medicines` (primary master, plural)
  - A `medication` table (singular) also exists — likely legacy. **When in doubt, prefer `medicines`.**
- `medicine_categories`, `medicine_manufacturers` — taxonomy
- `medicine_inventory` — current stock (no separate `pharmacy_batches` table; batch + expiry live here)
- `prescriptions`, `prescription_items` — doctor-written prescriptions
- `medicine_sales`, `medicine_sale_items` — pharmacy sales (header + lines)
- `medicine_returns`, `medicine_return_items` — returns
- `pharmacy_sales` — **separate** pharmacy-side sales table. Verify which one the live workflow writes to before adding logic.
- `inventory_items`, `inventory_status`, `item_stock`, `stock_movements`, `stock_transactions` — general inventory

### Procurement

- `purchase_orders`, `purchase_order_items` — PO header + lines. The pharmacy reorder agent (see [[inventory-management]]) writes drafts here.

### Billing

- `bills` — **lean header table** (10 columns: `bill_no`, `category`, `claim_id`, `patient_id`, `date`, `total_amount`, `status`, plus timestamps)
- `bill_sections`, `bill_line_items` — detail
- `aging_snapshots` — time-series aging buckets
- `outstanding_invoices` — unpaid invoices

> **Important:** the `financial_summary` table from migration `20250120000000_create_financial_summary_table.sql` is **not present in the current schema snapshot**. It may have been dropped or renamed. Agents should not assume it exists — query `bills` / `bill_line_items` directly or check `types.ts` before using.

### Accounting

- `chart_of_accounts` — account heads
- `ledger_groups`, `ledgers` — ledger structure
- `vouchers`, `voucher_types`, `voucher_entries` — double-entry vouchers
- `payment_allocations`, `payment_transactions` — payment lifecycle (a payment can be split across multiple bills)
- `daily_balances` — day-end roll-ups

### Resources & system

- `equipment`, `resource_allocations`, `resource_allocation_summary` — assets + allocation
- `gate_passes`, `discharge_checklist` — exit workflow
- `audit_trail` — cross-cutting change log
- `workflow_transitions` — state-machine transitions

---

## Rules agents should follow

1. **Start from `visits` for any per-encounter reasoning** — billing, discharge, clinical state are all on this table or one join away.
2. **Match scheme → surgery master** when generating cost estimates: `cghs_surgery` for CGHS patients, `hope_surgeons`/`hope_consultants` for private/Hope, scheme-specific masters elsewhere. Selecting the wrong master silently produces wrong bills.
3. **Verify `medicines` vs `medication` and `medicine_sales` vs `pharmacy_sales`** before writing. The duplicates are legacy ambiguity, not deliberate design.
4. **Respect `condonation_delay_submission`** when reasoning about late insurance claims — it means the deadline has been formally extended; the bill is not actually stale.
5. **Never assume `financial_summary` exists** — re-check `types.ts` first.
6. **Use `audit_trail`** when explaining "who changed what when" — it's the system-wide change log.
7. **All mutating operations must respect RLS** — never bypass with a service-role key from a user-context agent.

## Related

- [[adamrit-system-overview]]
- [[adamrit-clinical-workflows]]
- [[adamrit-billing-workflow]]
- [[adamrit-pharmacy-workflow]]
- [[Supabase-Schema]] (developer-side, with the full table inventory)
- [[hospital-abbreviations]]
- [[icd10-shortlist]]
