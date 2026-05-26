# OPD (Out-Patient Department)

#clinical

**Purpose:** Manages outpatient consultations — registration, queue management, doctor consultation, prescriptions, and follow-up.

**Connected to:** [[Patient Management]], [[Billing]], [[Lab]], [[Radiology]], [[Pharmacy]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Today's OPD | `src/pages/TodaysOpd.tsx` |
| OPD Admission Notes | `src/pages/OpdAdmissionNotes.tsx` |
| Queue Display (patient-facing) | `src/pages/QueueDisplay.tsx` |
| Queue Management (staff) | `src/pages/QueueManagement.tsx` |
| Doctor View | `src/pages/DoctorView.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/opd/` | OPD consultation UI, waiting room |
| `src/components/visit/` | Visit data — diagnoses, prescriptions |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `visits` | OPD visit record (type = 'OPD') |
| `visit_diagnoses` | Diagnoses from consultation |
| `visit_medications` | Prescriptions written |
| `visit_labs` | Lab tests ordered |
| `visit_radiology` | Imaging ordered |
| `visit_clinical_services` | Services delivered during visit |

---

## Key Workflows

```
Patient Arrives
  └─► Queue token assigned
        └─► Doctor Consultation
              ├─► Diagnosis recorded
              ├─► Prescription written → visit_medications
              ├─► Lab ordered → visit_labs
              └─► Bill generated → bills
```
