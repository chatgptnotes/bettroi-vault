# Corporate

#financial

**Purpose:** Corporate client management — package billing for corporate employees, bulk payment reconciliation, and relationship management.

**Connected to:** [[Patient Management]], [[Billing]], [[Insurance]], [[Marketing]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Corporate | `src/pages/Corporate.tsx` |
| Corporate Areas | `src/pages/CorporateAreas.tsx` |
| Corporate Area Detail | `src/pages/CorporateAreaDetail.tsx` |
| Corporate Bulk Payments | `src/pages/CorporateBulkPayments.tsx` |
| Relationship Manager | `src/pages/RelationshipManager.tsx` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `corporate` | Corporate client master (company, credit limit, package) |
| `corporate_bulk_payments` | Bulk payment from corporate against multiple bills |
| `relationship_managers` | RM master — staff who manage corporate accounts |

---

## Key Features

- **Corporate packages** — pre-negotiated rates for services
- **Credit billing** — employees billed to corporate account (not paid at counter)
- **Bulk payment** — corporate pays multiple bills in one transaction → automatically allocated
- **Area management** — corporate organized by geographic/business area
- **RM assignment** — each corporate account has a dedicated relationship manager

---

## Workflow

```
Corporate Employee visits
  └─► Identified as corporate patient at registration
        └─► Services billed at corporate package rates
              └─► Bill tagged to corporate account
                    └─► Corporate makes bulk payment
                          └─► Auto-allocated to individual bills
```
