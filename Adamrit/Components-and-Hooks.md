# Components & Hooks — Adamrit

Generated from `/Users/apple/Desktop/adarith/adamrit/src/components/` and `/Users/apple/Desktop/adarith/adamrit/src/hooks/`.

---

## Components — high-level grouping

### Routing & shell

- `AppRoutes.tsx` — central `<Routes>` table (referenced by `src/App.tsx`).
- `AppSidebar.tsx` — primary nav. Owns which routes appear in the sidebar.
- `LandingPage.tsx`, `LoginPage.tsx`, `HospitalSelection.tsx`.
- `ChangePasswordModal.tsx`.
- `ChatWidget.tsx`.

### Patient flow

- `AddPatientDialog.tsx` (+ `-stub.tsx`, folder)
- `EditPatientDialog.tsx` (+ `-stub.tsx`, folder)
- `EditPatientRegistrationDialog.tsx` (+ folder)
- `PatientRegistrationForm.tsx` (+ folder)
- `PatientCard.tsx`
- `PatientDetailsModal.tsx`
- `PatientLookup.tsx` (+ folder)
- `PatientClinicalSidebar.tsx`
- `BulkPatientImport.tsx` / `ImportRegistrationData.tsx` / `CSVImport.tsx`
- `CameraUpload.tsx`

### Diagnoses / clinical data

- `AddDiagnosisDialog.tsx`
- `DiagnosisCard.tsx`
- `EditComplicationsDialog.tsx`
- `MedicalDataForm.tsx`
- `ExaminationContent.tsx` / `HistoryContent.tsx`
- `ClinicalKPIs.tsx` / `ClinicalMgmtContent.tsx`

### Billing flow

- `AdvancePaymentModal.tsx`
- `BillSubmissionForm.tsx`
- `DiscountTab.tsx`
- `DischargeSummary.tsx` / `DischargeSummaryInterface.tsx`

### Doctor view / surgeons

- `DoctorView/`
- `EditSurgeonDialog.tsx`
- `LegacySurgeryMigrator.tsx` (+ `-stub.tsx`)

### Item / inventory

- `AddItemDialog.tsx` (+ folder)
- `DocumentUploadDialog.tsx` (+ `-stub.tsx`)

### ESIC / specific

- `ESICLetterGenerator.tsx`

### Conference

- `ConferenceCallDialog.tsx`

### Generic

- `NoResultsCard.tsx`

> The listing above covers the first ~50 components. Full directory: `src/components/` (~96 files). The `*-stub.tsx` variants are placeholder/fallback implementations kept alongside the live ones.

---

## Hooks — `src/hooks/` (data & state)

| Hook | Domain |
|---|---|
| `use-mobile.tsx` | responsive helper |
| `use-toast.ts` | toast notifications |
| `useAccountingData.ts` | accounting ledger |
| `useBatchInventory.ts` | pharmacy batch/expiry inventory |
| `useBillAgingReport.ts` | bill aging |
| `useBillData.ts` | bill fetch |
| `useBillSubmissions.ts` | bill submission queue |
| `useCashBookQueries.ts` | cash book |
| `useCompanies.ts` | corporate/B2B companies |
| `useCorporateBulkPayments.ts` | corporate bulk payment ingestion |
| `useCorporateData.ts` | corporate masters |
| `useCounts.ts` | dashboard counters |
| `useDailyPaymentAllocation.ts` | payment allocation across bills |
| `useDiagnoses.ts` / `useDiagnosisComplications.ts` | diagnoses |
| `useFinalBillData.ts` | final bill data (read-only — file frozen, see [[Known-Issues-and-Gotchas]]) |
| `useFinancialSummary.ts` | summary card on final bill |
| `useITTransactions.ts` | IT transaction register |
| `useLabData.ts` / `useLabTestConfig.ts` | lab orders + test config |
| `useLedgerStatement.ts` | ledger printout |
| `useMarketingData.ts` | marketing |
| `useMedicalData.ts` / `useMedicalDataMutations.ts` / `useMedicalDataTransaction.ts` | clinical data CRUD |
| `useMedicationData.ts` | pharmacy / prescriptions |
| `usePatientData.ts` / `usePatients.ts` / `usePatientOperations.ts` / `usePatientTransactions.ts` | patients |
| `usePaymentDetails.ts` / `usePaymentObligations.ts` | payments |
| `usePendingBillCount.ts` / `usePendingPrescriptions.ts` | dashboard pending |
| `usePermissions.ts` | role-based access |
| `usePrintColumns.ts` | print layout |
| `useRadiologyData.ts` | radiology |
| `useSearchableCghsSurgery.ts` / `useSearchableHopeSurgery.ts` / `useSearchableDiagnoses.ts` / `useSearchableLab.ts` / `useSearchableMedication.ts` / `useSearchableRadiology.ts` | autocomplete searches |
| `useShiftingAccommodation.ts` | ward shifting |
| `useTallyIntegration.ts` | Tally accounting export |
| `useTariffData.ts` | tariff master |
| `useValidation.ts` | form validation |
| `useVisitDiagnosis.ts` / `useVisitMedicalData.ts` / `useVisitMedicalSummary.ts` | visit-level clinical data |

> Some hooks share names with `src/queries/` files — `src/queries/` holds raw react-query wrappers, `src/hooks/` holds the composed hooks that pages import directly.

---

## Conventions

- **Component naming:** `PascalCase.tsx`. Folder-with-same-name pattern (`PatientLookup/` + `PatientLookup.tsx`) is used when a component has sub-files (helpers, sub-components, types).
- **`*-stub.tsx`:** intentional placeholder variants kept alongside the real implementation — used in environments where the full component isn't wired up.
- **Hook naming:** `useFooData` for read hooks, `useFooMutations` for write hooks, `useSearchableFoo` for autocomplete.
- **State management:** TanStack Query for server state. Local React state for UI. No Redux / Zustand.
