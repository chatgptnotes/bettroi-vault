# Routes & Pages — Adamrit

Generated from `/Users/apple/Desktop/adarith/adamrit/src/pages/` (137 files).

Route declarations live in `src/components/AppRoutes.tsx` (referenced by `src/App.tsx`). This page groups pages by **domain** rather than file order so they map cleanly to [[Home]] domain areas.

---

## Patient registration & profiles

- `Patients.tsx` — patient list / search
- `PatientProfile.tsx` — single patient overview
- `PatientLookup.tsx` / `PatientLookup/` — quick lookup widget
- `PatientRegistrationForm.tsx` / `PatientRegistrationForm/` — new patient intake
- `PatientDashboard.tsx` — per-patient dashboard
- `PatientOverview.tsx`
- `PatientPortal.tsx` — patient-facing portal
- `PatientLedger.tsx` — per-patient billing ledger
- `PatientJourneyLogs.tsx` — timeline of visits/events
- `SelfCheckIn.tsx` — kiosk self-check-in
- `SecurityVerificationPage.tsx` — identity verification gate

## OPD (outpatient)

- `TodaysOpd.tsx` — today's OPD list
- `OpdAdmissionNotes.tsx`
- `OpdSummaryLanding.tsx`
- `Appointments.tsx`

## IPD (inpatient)

- `CurrentlyAdmittedPatients.tsx`
- `TodaysIpdDashboard.tsx`
- `AdmissionNotes.tsx`
- `Shifting.tsx` — ward / room transfer
- `Accommodation.tsx`
- `RoomManagement.tsx`
- `NursingStation.tsx`

## Pharmacy

- `Pharmacy.tsx`
- `Medications.tsx`

## Lab

- `Lab.tsx`
- `LabMaster.tsx`
- `LabPrintDemo.tsx`
- `LabResultsEntryDemo.tsx`
- `SerologyReportDemo.tsx`
- `HomeCollection.tsx`
- `PhlebotomistDashboard.tsx`
- `ReportDelivery.tsx`

## Radiology / Imaging

- `Radiology.tsx`
- `RadiologyMaster.tsx`
- `RadiologyWorklist.tsx`
- `CTMRIModule.tsx`
- `CathLab.tsx`

## Operations / theatre

- `OperationTheatre.tsx`
- `Complications.tsx`
- `Diagnoses.tsx`
- `TreatmentSheet.tsx`
- `ClinicalServices.tsx` / `ClinicalServiceCreate.tsx`
- `MandatoryService.tsx` / `MandatoryServiceCreate.tsx`

## Billing

- `FinalBill.tsx` — **⚠️ FROZEN (see [[Known-Issues-and-Gotchas]])**
- `FinalBillTest.tsx`
- `FinalBill.tsx.backup` — historical snapshot, do not delete
- `EditFinalBill.tsx`
- `AdvancePayment.tsx`
- `DetailedInvoice.tsx`
- `DischargeInvoice.tsx`
- `ViewBill.tsx`
- `OldBills.tsx`
- `Invoice.tsx`
- `BillManagement.tsx`
- `BillApprovals.tsx`
- `BillSubmission.tsx`
- `BillAgingStatement.tsx`
- `DaywiseBills.tsx`
- `FinancialSummary.tsx` / `FinancialSummary-backup.tsx`
- `PhysiotherapyBill.tsx`
- `NoDeductionLetter.tsx`
- `PaymentQR.tsx`

## Accounting / Tally

- `Accounting.tsx`
- `CashBook.tsx`
- `DayBook.tsx`
- `LedgerStatement.tsx`
- `ITTransactionRegister.tsx`
- `TallyIntegration.tsx`
- `DailyPaymentAllocation.tsx`

## Discharge

- `IpdDischargeSummary.tsx`
- `DischargeSummaryEdit.tsx`
- `DischargeSummaryPrint.tsx`
- `DischargedPatients.tsx`
- `DeathCertificate.tsx`

## Reports

- `Reports.tsx`
- `ReportsIsolated.tsx`
- `ReportsSimple.tsx`
- `AdvanceStatementReport.tsx`
- `AdvancedStatementReport.tsx`
- `ExpectedPaymentDateReport.tsx`

## Masters

- `MasterData.tsx`
- `CghsSurgery.tsx` / `CghsSurgeryMaster.tsx`
- `PmjayMjpjayMaster.tsx` — **recently restored** (commits `26a5595`, `727cf81`, `792bcda`)
- `LabMaster.tsx`
- `RadiologyMaster.tsx`
- `ImplantMaster.tsx`
- `CorporateMaster.tsx`
- `LocationMaster.tsx`
- `EsicSurgeons.tsx`
- `HopeSurgeons.tsx` / `HopeConsultants.tsx` / `HopeAnaesthetists.tsx` / `HopeRMOs.tsx`
- `AyushmanSurgeons.tsx` / `AyushmanConsultants.tsx` / `AyushmanAnaesthetists.tsx` / `AyushmanRMOs.tsx`
- `Referees.tsx`

## Corporate / B2B

- `Corporate.tsx`
- `CorporateBill.tsx`
- `CorporateAreaDetail.tsx` / `CorporateAreas.tsx`
- `CorporateBulkPayments.tsx`
- `B2BLogin.tsx` / `B2BPortal.tsx`

## Marketing

- `Marketing.tsx`
- `MarketingDashboard.tsx`
- `MarketingFieldTracker.tsx`
- `MarketingIncentives.tsx`
- `RelationshipManager.tsx`

## Queue / display

- `QueueManagement.tsx`
- `QueueDisplay.tsx`
- `QueueStatus.tsx`
- `QueueTV.tsx`

## External requisitions

- `ExternalRequisition.tsx`
- `ExternalRequisitionCreate.tsx`

## Telephony / conference

- `TelephonyDashboard.tsx`
- `ConferenceCall.tsx` / `ConferenceCallPage.tsx`

## Print-specific

- `GatePassPrint.tsx`
- `PVIFormPrint.tsx`
- `P2Form.tsx`
- `LabPrintDemo.tsx`

## Admin / system

- `UserManagement.tsx`
- `Users.tsx`
- `StaffAttendance.tsx`
- `ActivityLog.tsx`
- `LandingPage.tsx`
- `Index.tsx`
- `NotFound.tsx`
- `DirectorDashboard.tsx`
- `DoctorView.tsx` / `DoctorView/`

## Sub-folders (non-route grouping inside `src/pages/`)

- `__tests__/`
- `prescriptions/`
- `AyushmanConsultants/`, `AyushmanRMOs/`
- `HopeConsultants/`, `HopeRMOs/`

Component-level grouping → [[Components-and-Hooks]].
