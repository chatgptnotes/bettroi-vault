# Insurance

#financial

**Purpose:** Government health insurance scheme management — Ayushman Bharat, CGHS, ESIC, and HOPE scheme. Manages empanelled doctors, procedure codes, implant approvals, and insurance billing.

**Connected to:** [[Patient Management]], [[Billing]], [[Operation Theatre]], [[Corporate]], [[Master Data]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Ayushman Surgeons | `src/pages/AyushmanSurgeons.tsx` |
| Ayushman Consultants | `src/pages/AyushmanConsultants.tsx` |
| Ayushman RMOs | `src/pages/AyushmanRMOs.tsx` |
| ESIC Surgeons | `src/pages/EsicSurgeons.tsx` |
| HOPE Surgeons | `src/pages/HopeSurgeons.tsx` |
| HOPE Consultants | `src/pages/HopeConsultants.tsx` |
| CGHS Surgery | `src/pages/CghsSurgery.tsx` |

---

## Database Tables

### Ayushman Bharat
| Table | Purpose |
|-------|---------|
| `ayushman_surgeons` | Empanelled surgeons |
| `ayushman_consultants` | Empanelled consultants |
| `ayushman_anaesthetists` | Empanelled anaesthetists |

### HOPE Scheme
| Table | Purpose |
|-------|---------|
| `hope_surgeons` | Hope scheme surgeons |
| `hope_consultants` | Hope scheme consultants |
| `hope_anaesthetists` | Hope scheme anaesthetists |

### ESIC
| Table | Purpose |
|-------|---------|
| `esic_surgeons` | ESIC panel surgeons |

### Yojana MH (15 tables)
| Table group | Purpose |
|-------------|---------|
| `yojana_mh_procedures` | Insurance procedure codes + rates |
| `yojana_mh_implants` | Approved implants |
| `yojana_mh_conditions` | Covered conditions/diagnoses |
| `yojana_mh_*` (12 more) | Supporting configuration tables |

---

## Key Features

- Doctor empanelment management (per scheme)
- Procedure code mapping to insurance rates
- Implant pre-approval tracking
- Insurance bill generation with scheme-specific fields
- CGHS surgery procedure master
