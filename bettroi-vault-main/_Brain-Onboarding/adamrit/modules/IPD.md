# IPD (In-Patient Department)

#clinical

**Purpose:** Manages inpatient admissions — ward allocation, bed management, nursing care, treatment sheets, shifting, and discharge.

**Connected to:** [[Patient Management]], [[Billing]], [[Pharmacy]], [[Lab]], [[Radiology]], [[Operation Theatre]], [[Insurance]], [[Supabase]], [[Twilio]]

---

## Key Pages

| Page | File |
|------|------|
| Today's IPD | `src/pages/TodaysIpd.tsx` |
| Currently Admitted | `src/pages/CurrentlyAdmittedPatients.tsx` |
| IPD Admission Notes | `src/pages/AdmissionNotes.tsx` |
| Treatment Sheet | `src/pages/TreatmentSheet.tsx` |
| IPD Discharge Summary | `src/pages/IpdDischargeSummary.tsx` |
| Ward Shifting | `src/pages/Shifting.tsx` |
| Room Management | `src/pages/RoomManagement.tsx` |
| Nursing Station | `src/pages/NursingStation.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/ipd/` | IPD-specific UI (ward view, bed status) |
| `src/components/discharge/` | Discharge checklist, summary forms |
| `src/components/shifting/` | Ward transfer forms |
| `src/components/visit/` | Visit medical data (diagnoses, medications, labs) |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `visits` | IPD admission record (type = 'IPD') |
| `accommodations` | Ward/room/bed master |
| `visit_medications` | Medicines prescribed during admission |
| `visit_labs` | Lab tests ordered during stay |
| `visit_radiology` | Radiology ordered during stay |
| `visit_surgeries` | Surgeries performed |
| `visit_implants` | Implants used |
| `visit_diagnoses` | ICD diagnosis codes |
| `visit_complications` | Documented complications |
| `discharge_summaries` | Discharge documentation |
| `pre_op_checklist` | Pre-operation checklist |
| `intra_op_notes` | During-surgery notes |
| `post_op_notes` | Post-surgery notes |

---

## Key Workflows

```
Admission
  └─► Visit created (type=IPD)
        └─► Ward allocated (accommodations)
              ├─► Treatment Sheet → visit_medications
              ├─► Lab orders → visit_labs
              ├─► OT booking → visit_surgeries
              └─► Discharge
                    └─► Summary created → discharge_summaries
                          └─► Final Bill → bills
```
