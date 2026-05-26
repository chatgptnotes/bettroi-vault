# Radiology

#clinical

**Purpose:** Radiology department management — procedure ordering, appointment scheduling, DICOM study management, reporting, and quality assurance.

**Connected to:** [[Patient Management]], [[IPD]], [[OPD]], [[Billing]], [[Master Data]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Radiology (main) | `src/pages/Radiology.tsx` |

## Key Components

| Component | Purpose |
|-----------|---------|
| `src/components/radiology/RadiologyWorklist.tsx` | Procedure queue |
| Radiology report UI | `src/components/radiology/` (various) |

## Key Hooks

| Hook | File |
|------|------|
| Radiology data | `src/hooks/useRadiologyData.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `visit_radiology` | Radiology procedures ordered per visit |
| `radiology_orders` | Order details and status |
| `radiology_reports` | Final radiology reports |
| `radiology_modalities` | Imaging modalities (CT, MRI, X-ray, Ultrasound) |
| `radiology_procedures` | Procedure master catalogue |
| `radiology_appointments` | Scheduling |
| `dicom_studies` | DICOM file references |
| `radiology_report_templates` | Standardized report templates |
| `radiology_qa_checks` | Quality assurance records |
| `radiation_dose_tracking` | Radiation safety log |
| `radiologists` | Radiologist master |
| `radiology_technologists` | Technologist master |

---

## Key Features

- **Worklist** — tech sees pending procedures by modality
- **DICOM integration** — links to external DICOM viewer
- **Report templates** — pre-built templates per procedure type
- **Radiation dose tracking** — safety compliance
- **QA checks** — quality control per study
