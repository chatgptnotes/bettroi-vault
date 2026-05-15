# Supabase Schema — Adamrit

## Source of truth

All schema changes flow through SQL migrations:

- **`/Users/apple/Desktop/adarith/adamrit/supabase/migrations/`** — 331 files, timestamped (`YYYYMMDDHHmmss-<slug>.sql`).
- **`/Users/apple/Desktop/adarith/adamrit/supabase-migrations/`** — archived earlier migration set.

Generated TypeScript types live at **`src/integrations/supabase/types.ts`** — regenerate with `npm run generate-types` after schema changes.

The Supabase client used by the React app is in **`src/integrations/supabase/client.ts`**.

---

## Inferred core entities (from migration names + hook usage)

These are the primary tables the app reads/writes. See `src/integrations/supabase/types.ts` for the authoritative type definitions.

| Entity | Purpose | Used by hooks |
|---|---|---|
| `patients` | Master patient record | `usePatients`, `usePatientData`, `usePatientOperations` |
| `visits` | One row per patient encounter (OPD/IPD) | `useVisitDiagnosis`, `useVisitMedicalData`, `useVisitMedicalSummary` |
| `diagnoses` | Diagnosis catalog | `useDiagnoses`, `useSearchableDiagnoses` |
| `visit_diagnoses` | Junction table (visit × diagnosis) | `useVisitDiagnosis` |
| `visit_implants` | Junction (visit × implant) — migration `20250121_create_visit_implants_table` | — |
| `medications` | Pharmacy master | `useMedicationData`, `useSearchableMedication` |
| `pharmacy_batches` / inventory | Batch + expiry stock | `useBatchInventory` |
| `lab_tests` + config | Lab catalog and formula rules | `useLabData`, `useLabTestConfig` |
| `radiology_orders` | Imaging requests | `useRadiologyData` |
| `bills` / `bill_items` | Final + interim bills | `useBillData`, `useFinalBillData` |
| `advance_payments` | Pre-bill advance receipts | (see `AdvancePayment.tsx`) |
| `financial_summary` | Summary card data — migration `20250120000000_create_financial_summary_table` | `useFinancialSummary` |
| `ledger` / `cash_book` / `day_book` | Accounting | `useAccountingData`, `useCashBookQueries`, `useLedgerStatement` |
| `bill_submissions` | Insurance/corporate claim queue | `useBillSubmissions` |
| `corporate_companies` / `corporate_areas` | B2B masters | `useCompanies`, `useCorporateData` |
| `corporate_bulk_payments` | B2B payment ingestion | `useCorporateBulkPayments` |
| `marketing_*` | Marketing CRM | `useMarketingData` |
| `tariff_*` | Pricing masters (CGHS / PMJAY / private) | `useTariffData`, `useSearchableCghsSurgery`, `useSearchableHopeSurgery` |
| `users` + RBAC | Auth + roles | `usePermissions` |
| `it_transactions` | IT register | `useITTransactions` |
| `payment_allocations` | Maps payments → bills | `useDailyPaymentAllocation` |

---

## Notable recent migrations

| Date | Migration | What it changed |
|---|---|---|
| 2025-01-16 | `20250116140000_add_billing_fields_to_visits.sql` | Added billing fields directly on `visits` |
| 2025-01-17 | `20250117000000_add_condonation_delay_submission_column.sql` | Insurance submission delay tracking |
| 2025-01-17 | `20250117000000_create_medical_junction_tables.sql` | Junction tables for medical data |
| 2025-01-20 | `20250120000000_create_financial_summary_table.sql` | Summary table for final bill card |
| 2025-01-21 | `20250121_create_visit_implants_table.sql` | Visit → implants junction |
| 2025-01-21 | `20250121_fix_visit_implants_rate_type.sql` | Rate-type column fix |
| 2025-01-24 | `20250124_add_iron_studies_formula.sql` | Lab formula for iron-studies panel |
| 2025-06-10 onwards | Many migrations (Lovable-tagged UUIDs) | Patient/diagnosis/complications/antibiotics tracking |

> The migration table goes back to `20250610...` and forward to recent files. Look at the bottom of `supabase/migrations/` (`ls -lt`) to see what's most recent before working in this area.

---

## Conventions

- **Migration filename:** `YYYYMMDDHHmmss-<slug>.sql` or `YYYYMMDD_<slug>.sql`. Lovable-generated migrations use UUID slugs.
- **Junction tables:** named `<parent>_<child>` (e.g. `visit_diagnoses`, `visit_implants`).
- **RLS:** every table should have RLS enabled. Auth flows through the Supabase client — `src/integrations/supabase/client.ts`.
- **Type regeneration:** after a migration is added, run `npm run generate-types` to refresh `src/integrations/supabase/types.ts`. This is a separate manual step, not automated.

---

## Where supabase docs live in this repo

- Diagnostic scripts and one-off setup notes: `supabase/` (root level — files like `FIX_PATIENT_MODAL_README.md` per the older 70-file doc set, deliberately not mirrored here).
- The canonical schema is the migration set itself + the generated types file.

For agent-facing schema descriptions (no SQL, just entity definitions), see [[adamrit-supabase-schema]] in `agent-corpus/`.
