# Patient Management

#clinical

**Purpose:** Core patient registry — registration, demographics, visit history, documents, and patient journey tracking. Every other clinical module starts here.

**Connected to:** [[IPD]], [[OPD]], [[Lab]], [[Radiology]], [[Pharmacy]], [[Billing]], [[Operation Theatre]], [[Insurance]], [[Marketing]], [[Supabase]], [[Twilio]], [[DoubleTick WhatsApp]]

---

## Key Pages

| Page | File |
|------|------|
| Patient Dashboard (reception) | `src/pages/PatientDashboard.tsx` |
| Patient Profile | `src/pages/PatientProfile.tsx` |
| Patient Overview | `src/pages/PatientOverview.tsx` |
| Currently Admitted | `src/pages/CurrentlyAdmittedPatients.tsx` |
| Discharged Patients | `src/pages/DischargedPatients.tsx` |
| Hospital Selection + Login | `src/pages/Login.tsx`, `src/pages/HospitalSelection.tsx` |
| Queue Management | `src/pages/QueueManagement.tsx`, `src/pages/QueueDisplay.tsx` |
| Activity Log | `src/pages/ActivityLog.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/patient/` | Patient info cards, document management |
| `src/components/shared/` | Search bar, patient selector |
| `src/components/sidebar/` | Navigation |

## Key Hooks

| Hook | File |
|------|------|
| Visit data | `src/hooks/useVisitsData.ts` |
| Patient ID generation | `src/utils/patientIdGenerator.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `patients` | Patient master — name, DOB, contact, UHID |
| `visits` | Each hospital visit/admission record |
| `patient_ledgers` | Financial account per patient |
| `gate_passes` | Patient exit authorization |
| `whatsapp_notifications` | WhatsApp message audit per patient |
| `patient_call_records` | Twilio call history per patient |
| `ai_clinical_recommendations` | AI suggestions shown per visit |

---

## Patient Flow

```
New Patient
  └─► Registration (patients table)
        └─► Visit Created (visits table)
              ├─► OPD consultation
              ├─► IPD admission
              └─► Emergency walk-in
```

---

## See Also

- [[IPD]] — inpatient admissions
- [[OPD]] — outpatient visits
- [[Billing]] — financial account per patient
