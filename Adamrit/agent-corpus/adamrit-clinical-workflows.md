---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: draft
tags: [sop, adamrit, clinical, opd, ipd, discharge]
---

# Adamrit — Clinical Workflows (OPD → IPD → Discharge)

## Patient lifecycle

```
Registration → Visit (OPD or IPD) → Clinical data capture → Orders (lab/radiology/pharmacy) → Billing → Discharge → Ledger close
```

A single **patient** record can have many **visits**. Each visit is either OPD (outpatient, same-day) or IPD (inpatient, with admission + room + length of stay).

## 1. Registration

Surface area: `src/pages/Patients.tsx`, `PatientRegistrationForm.tsx`, `AddPatientDialog.tsx`, `BulkPatientImport.tsx`, `SelfCheckIn.tsx`.

- Patient record stores demographics, scheme membership (ESIC / CGHS / PMJAY / MJPJAY / corporate / private), ID-card linkage, and contact details.
- Identity verification at the gate uses `SecurityVerificationPage.tsx`.

## 2. OPD (outpatient) flow

Surface area: `TodaysOpd.tsx`, `OpdAdmissionNotes.tsx`, `OpdSummaryLanding.tsx`, `Appointments.tsx`.

- Patient appears in **today's OPD list** for the relevant department.
- Clinical team records examination, history, diagnoses, complications, treatment.
- Orders (lab tests, radiology, prescriptions) are placed inline.
- If the patient is to be admitted, the visit is converted to an IPD admission.

## 3. IPD (inpatient) flow

Surface area: `CurrentlyAdmittedPatients.tsx`, `TodaysIpdDashboard.tsx`, `AdmissionNotes.tsx`, `Shifting.tsx`, `Accommodation.tsx`, `RoomManagement.tsx`, `NursingStation.tsx`.

- Admission notes are recorded and a room is allocated.
- Ward / room transfers ("shifting") are tracked with timestamps for accommodation charging.
- Daily progress is recorded against the visit; nursing-station UI surfaces the live ward state.

## 4. Clinical data capture (cross-cutting)

- **Diagnoses:** master in `Diagnoses.tsx`, junction `visit_diagnoses`, searchable via `useSearchableDiagnoses`.
- **Complications:** `Complications.tsx` and `EditComplicationsDialog.tsx`, tied to the visit + diagnosis.
- **Medical data:** `MedicalDataForm.tsx`, persisted via `useMedicalData` / `useMedicalDataMutations` / `useMedicalDataTransaction`.
- **Treatment sheet:** `TreatmentSheet.tsx` for the bedside order log.

## 5. Orders

- **Lab:** `Lab.tsx`, `LabMaster.tsx`, results via `LabResultsEntryDemo.tsx`, formulas via `useLabTestConfig`. Home collection supported (`HomeCollection.tsx`).
- **Radiology:** `Radiology.tsx`, `RadiologyWorklist.tsx`, CT/MRI, CathLab.
- **Pharmacy:** see [[adamrit-pharmacy-workflow]].

## 6. Billing during stay

Bills accumulate on the visit. Advance payments can be taken at any point. Final bill is generated near discharge. See [[adamrit-billing-workflow]].

## 7. Discharge

Surface area: `IpdDischargeSummary.tsx`, `DischargeSummaryEdit.tsx`, `DischargeSummaryPrint.tsx`, `DischargedPatients.tsx`.

- Discharge summary captures diagnosis on discharge, surgery performed (AI-assisted generation, see note below), medications on discharge, follow-up instructions.
- Final bill must be settled (or marked deferred via `NoDeductionLetter.tsx` / scheme rules) before the patient is discharged.
- In death cases, `DeathCertificate.tsx` is generated instead.

**AI surgery generation:** the discharge summary uses an LLM call with `maxOutputTokens: 2000` (raised from 800 in a prior fix). Truncated surgery sections usually mean the limit was reverted — leave it at ≥2000.

## Roles

| Role | What they do in this flow |
|---|---|
| Registration clerk | Create patient, attach scheme, route to OPD/IPD |
| Doctor (OPD / RMO / Consultant / Surgeon) | Record diagnoses, complications, orders, discharge plan |
| Nurse | Treatment sheet, shifting, vitals |
| Lab / Radiology technician | Run orders, enter results |
| Pharmacist | Dispense + bill ([[adamrit-pharmacy-workflow]]) |
| Billing clerk | Advance receipts, final bill, discharge invoice ([[adamrit-billing-workflow]]) |
| Accounts | Reconcile ledger, Tally export |

## Related

- [[adamrit-system-overview]]
- [[adamrit-billing-workflow]]
- [[adamrit-pharmacy-workflow]]
- [[hospital-abbreviations]] — ESIC, CGHS, PMJAY, MJPJAY, OPD, IPD, RMO definitions
- [[icd10-shortlist]] — diagnosis coding
