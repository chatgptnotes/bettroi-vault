# Lab

#clinical

**Purpose:** Laboratory services — test ordering, worklist management, result entry (with formula auto-calculation), quality control, external requisitions, and result delivery via WhatsApp.

**Connected to:** [[Patient Management]], [[IPD]], [[OPD]], [[Billing]], [[Twilio]], [[OpenAI]], [[Master Data]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Lab (main) | `src/pages/Lab.tsx` |
| Phlebotomist Dashboard | `src/pages/PhlebotomistDashboard.tsx` |
| Home Collection | `src/pages/HomeCollection.tsx` |
| External Requisition | `src/pages/ExternalRequisition.tsx` |

## Key Components

| Component | Purpose |
|-----------|---------|
| `src/components/lab/LabOrders.tsx` (260KB) | Test ordering, massive multi-panel component |
| `src/components/lab/EnhancedLabResultsForm.tsx` | Result data entry with formula calc |
| `src/components/lab/LabPanelManager.tsx` (134KB) | Panel configuration |
| `src/components/lab/LabTestConfigManager.tsx` | Test parameters setup |
| `src/components/lab/LabTestFormBuilder.tsx` | Custom test form designer |
| `src/components/lab/QualityControl.tsx` | QC checks |
| `src/components/lab/LabWorklist.tsx` | Processing queue |

## Key Hooks

| Hook | File |
|------|------|
| Lab queries | `src/hooks/useLabData.ts` (47KB) |

## Key Utilities

| Utility | File |
|---------|------|
| Lab test config helper | `src/utils/labTestConfigHelper.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `visit_labs` | Lab tests ordered per visit |
| `lab_orders` | Lab order tracking |
| `lab_tests` | Lab test master catalogue |
| `lab_test_config` | Test parameters, formulas, reference ranges |
| `lab_results` | Actual test results entered |
| `lab_worklists` | Processing queue |
| `lab_departments` | Lab organizational units |
| `test_categories` | Test groupings |
| `test_panels` | Panel bundles (e.g. LFT, KFT) |
| `lab_equipment` | Lab instruments |

---

## Key Features

- **Formula auto-calculation** — results derived from sub-test values automatically
- **Nested sub-tests** — panels contain individual tests
- **Worklist** — lab tech sees pending tests per instrument
- **QC** — quality control checks per instrument
- **WhatsApp delivery** — report sent to patient/doctor on completion via [[Twilio]]
- **Home collection** — field phlebotomist tracks sample pickup
- **External requisition** — orders sent to external labs
