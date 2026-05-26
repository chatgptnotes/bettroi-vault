---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: approved
tags: [sop, adamrit, billing, finance, ledger]
---

# Adamrit — Billing Workflow

## End-to-end billing chain

```
Patient registered with scheme
   ↓
Advance payment receipt (optional, repeatable)
   ↓
Services accumulate on visit (consultations, lab, radiology, pharmacy, room, surgery)
   ↓
Final bill generated (FROZEN page — read below)
   ↓
Discharge invoice / detailed invoice printed
   ↓
Payment / no-deduction letter / corporate submission
   ↓
Ledger entry (cash book / day book)
   ↓
Tally export
```

## 1. Advance payment

- UI: `AdvancePayment.tsx`, `AdvancePaymentModal.tsx`.
- Stored against the visit. Multiple advances may be taken per visit.
- Reflects on the financial summary card immediately.
- A `PaymentQR.tsx` flow exists for QR-code-based receipt.

## 2. Service accumulation

Items posted to the visit during the stay:

- **Consultations** — doctor visits.
- **Lab orders** — priced per `LabMaster.tsx` / tariff.
- **Radiology** — priced per `RadiologyMaster.tsx`.
- **Pharmacy items** — dispensed via the pharmacy flow ([[adamrit-pharmacy-workflow]]).
- **Room / accommodation** — priced per day per `Accommodation.tsx` + shifting log.
- **Surgery** — CGHS / Hope / Ayushman / private surgery masters drive pricing.
- **Implants** — `ImplantMaster.tsx`; junction `visit_implants`.

Each scheme has its own tariff master:

| Scheme | Tariff source |
|---|---|
| CGHS | `CghsSurgery.tsx`, `CghsSurgeryMaster.tsx` |
| PMJAY / MJPJAY | `PmjayMjpjayMaster.tsx` |
| Private / Hope | `HopeSurgeons.tsx`, related Hope masters |
| Ayushman | `AyushmanSurgeons.tsx` + related |
| ESIC | scheme rules drive routing; ESIC letter via `ESICLetterGenerator.tsx` |

**Selecting the wrong tariff master silently produces wrong bills.** Always confirm the patient's scheme before posting chargeable items.

## 3. Final bill

⚠️ **`src/pages/FinalBill.tsx` is feature-frozen.** A SHA256 lock check (`scripts/check-finalbill-locked.cjs`) blocks the build if it drifts. Do not modify the file or its visual / financial elements without explicit author authorization. See the developer-side gotcha note for full detail.

Visible elements:

- Financial summary card (totals, advances, balance)
- Tabs: External Requisition, Investigations
- Buttons: Advance Payment, Yojna Bill, Final Payment, Detailed Invoice
- Printed FINAL BILL preview

Auxiliary billing screens (not frozen): `EditFinalBill.tsx`, `DetailedInvoice.tsx`, `DischargeInvoice.tsx`, `ViewBill.tsx`, `OldBills.tsx`, `FinancialSummary.tsx`.

## 4. Submission & approvals

- **Bill submission queue:** `BillSubmission.tsx`, `BillSubmissionForm.tsx`, `useBillSubmissions`.
- **Approvals:** `BillApprovals.tsx`.
- **Aging tracking:** `BillAgingStatement.tsx`, `useBillAgingReport`.
- **Insurance condonation:** there is a `condonation_delay_submission` column on the relevant table (migration `20250117000000_add_condonation_delay_submission_column.sql`) used when submissions exceed the deadline.

## 5. Payments & allocation

- **Payment details:** `usePaymentDetails`, `usePaymentObligations`.
- **Daily allocation:** `DailyPaymentAllocation.tsx`, `useDailyPaymentAllocation` — splits an incoming payment across one or more open bills.
- **Corporate bulk payments:** `CorporateBulkPayments.tsx`, `useCorporateBulkPayments`.

## 6. Ledger & accounting

- **Cash book:** `CashBook.tsx`, `useCashBookQueries`.
- **Day book:** `DayBook.tsx`.
- **Patient ledger:** `PatientLedger.tsx`.
- **Ledger statement (printable):** `LedgerStatement.tsx`, `useLedgerStatement`.
- **IT transaction register:** `ITTransactionRegister.tsx`, `useITTransactions`.
- **Tally export:** `TallyIntegration.tsx`, `useTallyIntegration`, `npm run tally:sync` / `tally:direct-sync`.

## 7. Specialty bills

- **Physiotherapy:** `PhysiotherapyBill.tsx`.
- **Corporate / B2B:** `CorporateBill.tsx`.
- **No-deduction letter** (when scheme says nothing extra is recoverable): `NoDeductionLetter.tsx`.

## Reporting

- `Reports.tsx`, `AdvanceStatementReport.tsx`, `AdvancedStatementReport.tsx`, `ExpectedPaymentDateReport.tsx`, `DaywiseBills.tsx`.

## Related

- [[adamrit-system-overview]]
- [[adamrit-clinical-workflows]] — what generates the chargeable items
- [[adamrit-pharmacy-workflow]] — pharmacy-side billing
- [[adamrit-supabase-schema]] — bill, advance, ledger, payment entities
- [[hospital-abbreviations]] — scheme acronyms
