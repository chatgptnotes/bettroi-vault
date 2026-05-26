# Master Data

#admin

**Purpose:** Central reference data management — doctors, surgeons, anaesthetists, medicines, lab tests, radiology procedures, locations, equipment, and all other master catalogues.

**Connected to:** [[Patient Management]], [[IPD]], [[OPD]], [[Lab]], [[Radiology]], [[Pharmacy]], [[Operation Theatre]], [[Billing]], [[Insurance]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Master Data (hub) | `src/pages/MasterData.tsx` |
| Medications | `src/pages/Medications.tsx` |
| Implant Master | `src/pages/ImplantMaster.tsx` |
| Complications | `src/pages/Complications.tsx` |
| Location Master | `src/pages/LocationMaster.tsx` |
| Room Management | `src/pages/RoomManagement.tsx` |
| Mandatory Service | `src/pages/MandatoryService.tsx` |
| Clinical Services | `src/pages/ClinicalServices.tsx` |

---

## Database Tables

### People Masters
| Table | Purpose |
|-------|---------|
| `staff_members` | All hospital staff |
| `radiologists` | Radiologist master |
| `radiology_technologists` | Rad-tech master |
| `referees` | Referring doctors |
| `relationship_managers` | Corporate RMs |
| `marketing_users` | Marketing agents |

### Clinical Masters
| Table | Purpose |
|-------|---------|
| `medications` / `medication` | Medicine catalogue |
| `lab_tests` | Lab test master |
| `lab_test_config` | Test parameters, formulas, reference ranges |
| `diagnoses` | ICD diagnosis codes |
| `complications` | Complication master |
| `radiology_procedures` | Imaging procedure catalogue |
| `radiology_modalities` | CT, MRI, X-ray, Ultrasound, etc. |
| `radiology_report_templates` | Standard report templates |

### Location Masters
| Table | Purpose |
|-------|---------|
| `accommodations` | Ward, room, bed master |
| `operation_theatres` | OT room master |
| `lab_departments` | Lab department org |
| `lab_equipment` | Lab instruments |
| `equipment` | General hospital equipment |

### Service Masters
| Table | Purpose |
|-------|---------|
| `test_categories` | Lab test groupings |
| `test_panels` | Lab panel bundles |
| `visit_clinical_services` | Clinical service catalogue |

---

## Importance

Master Data is the **foundation** for all other modules. No clinical or financial operation can function without properly configured master data. All modules pull from these tables via [[Supabase]].
