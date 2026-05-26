# Operation Theatre

#clinical

**Purpose:** Surgical operations management — OT scheduling, pre-op checklist, intra-op notes, post-op notes, surgeon/anaesthetist assignment, implant tracking, and OT utilization reports.

**Connected to:** [[Patient Management]], [[IPD]], [[Billing]], [[Insurance]], [[Master Data]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Operation Theatre | `src/pages/OperationTheatre.tsx` |
| Cath Lab | `src/pages/CathLab.tsx` |
| Implant Master | `src/pages/ImplantMaster.tsx` |
| CGHS Surgery | `src/pages/CghsSurgery.tsx` |
| Complications master | `src/pages/Complications.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/operation-room/` | OT scheduling, procedure notes forms |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `operation_theatres` | OT room master |
| `ot_patients` | OT usage tracking per patient |
| `ot_notes` | OT scheduling notes |
| `visit_surgeries` | Surgery record per visit |
| `visit_implants` | Implants used per surgery |
| `pre_op_checklist` | Pre-operative safety checklist |
| `intra_op_notes` | Notes during surgery |
| `post_op_notes` | Post-operative notes |

## Staff Tables (from Insurance module)

| Table | Purpose |
|-------|---------|
| `ayushman_surgeons` | Empanelled Ayushman surgeons |
| `hope_surgeons` | Hope scheme surgeons |
| `esic_surgeons` | ESIC surgeons |
| `ayushman_anaesthetists` | Empanelled anaesthetists |
| `hope_anaesthetists` | Hope scheme anaesthetists |

---

## Key Features

- **Pre-op checklist** — safety verification before surgery starts
- **Intra-op notes** — real-time surgical notes
- **Implant tracking** — catalogue + per-surgery implant usage
- **Insurance integration** — Ayushman/CGHS/ESIC procedure codes linked to surgeries
- **Cath Lab** — separate cardiac catheterization OT workflow
