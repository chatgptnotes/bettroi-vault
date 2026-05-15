# Home — Adamrit (ESIC Patient Mapper)

> Browsable knowledge map of the **Adamrit hospital management system** — the React + Vite + Supabase codebase at `chatgptnotes/adamrit.com`.
> Open **Graph View** (Cmd+G) to see how the pieces connect.

This is the developer-facing reference. The same content rewritten for agent retrieval lives in `agent-corpus/` (with frontmatter).

---

## 🟢 Start Here

1. **[[Architecture]]** — Tech stack, top-level folder layout, entry points (`src/App.tsx`, `vite.config.ts`).
2. **[[Routes-and-Pages]]** — Index of all 137 routes (OPD, IPD, pharmacy, billing, lab, discharge, …).
3. **[[Components-and-Hooks]]** — UI building blocks: `src/components/` (~96) and `src/hooks/` (~49).
4. **[[Supabase-Schema]]** — Database tables, the 331 migrations that built them.
5. **[[Build-and-Deploy]]** — npm scripts, Vite config, Vercel deployment.
6. **[[Known-Issues-and-Gotchas]]** — FinalBill freeze, the Ironbark skill loader, ESIC-specific behavior.

---

## 🧠 What is Adamrit?

A comprehensive hospital management system for **patient registration → admission → OPD/IPD care → pharmacy → lab → billing → discharge → ledger accounting**. Originally built for ESIC (Employees' State Insurance Corporation) patient mapping, now used across hospital workflows.

**One-line tech stack:** Vite 5 + React 18 + TypeScript + shadcn-ui + Tailwind + Supabase + Vercel.

---

## 📂 Domain areas (mapped to source folders)

| Domain | Where it lives |
|---|---|
| Patient registration & profiles | `src/pages/Patients.tsx`, `PatientProfile.tsx`, `PatientLookup.tsx`, `PatientRegistrationForm.tsx` |
| OPD (outpatient) | `TodaysOpd.tsx`, `OpdAdmissionNotes.tsx`, `OpdSummaryLanding.tsx` |
| IPD (inpatient) | `CurrentlyAdmittedPatients.tsx`, `TodaysIpdDashboard.tsx`, `AdmissionNotes.tsx`, `Shifting.tsx` |
| Pharmacy | `Pharmacy.tsx`, `Medications.tsx`, `useBatchInventory.ts`, `useMedicationData.ts` |
| Lab | `Lab.tsx`, `LabMaster.tsx`, `useLabData.ts`, `useLabTestConfig.ts` |
| Billing | `FinalBill.tsx` (**frozen**), `AdvancePayment.tsx`, `EditFinalBill.tsx`, `DetailedInvoice.tsx`, `DischargeInvoice.tsx`, `ViewBill.tsx`, `BillManagement.tsx` |
| Accounting / Tally | `Accounting.tsx`, `CashBook.tsx`, `DayBook.tsx`, `LedgerStatement.tsx`, `TallyIntegration.tsx`, `useTallyIntegration.ts` |
| Discharge | `IpdDischargeSummary.tsx`, `DischargeSummaryEdit.tsx`, `DischargeSummaryPrint.tsx`, `DischargedPatients.tsx`, `DeathCertificate.tsx` |
| Reports | `Reports.tsx`, `AdvanceStatementReport.tsx`, `BillAgingStatement.tsx`, `ExpectedPaymentDateReport.tsx` |
| Masters | `MasterData.tsx`, `CghsSurgeryMaster.tsx`, `PmjayMjpjayMaster.tsx`, `LabMaster.tsx`, `RadiologyMaster.tsx`, `ImplantMaster.tsx`, `CorporateMaster.tsx`, `LocationMaster.tsx` |
| Marketing | `Marketing.tsx`, `MarketingDashboard.tsx`, `MarketingFieldTracker.tsx`, `MarketingIncentives.tsx` |
| Queue / display | `QueueManagement.tsx`, `QueueDisplay.tsx`, `QueueTV.tsx`, `SelfCheckIn.tsx` |
| Corporate (B2B) | `Corporate.tsx`, `CorporateBill.tsx`, `B2BPortal.tsx`, `B2BLogin.tsx`, `CorporateBulkPayments.tsx` |

---

## 🔗 Glossary cross-links

Domain terms used throughout the codebase — definitions live in the vault glossary:
- [[hospital-abbreviations]] — OPD, IPD, ESIC, CGHS, PMJAY, MJPJAY, RMO, GRN, PO, etc.
- [[icd10-shortlist]] — diagnosis coding used in `Diagnoses.tsx` and `useDiagnoses.ts`.

---

## 📅 Status

- **2026-05-15** — Vault folder initialized from the adamrit codebase snapshot at commit `792bcda`.

---

## 🔗 External references

- **GitHub:** https://github.com/chatgptnotes/adamrit.com
- **Local checkout:** `/Users/apple/Desktop/adarith/adamrit`
- **Deployment:** Vercel (frontend) + Supabase (backend)
- **Related ADR:** [[0001-obsidian-as-source-of-truth]] — explains why Adamrit subscribes to this vault for SOPs.
