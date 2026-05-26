# Reports & Analytics

#reporting

**Purpose:** Cross-module reporting — financial reports, clinical reports, marketing reports, operational census, and audit trails.

**Connected to:** [[Patient Management]], [[IPD]], [[Billing]], [[Accounting]], [[Lab]], [[Radiology]], [[Pharmacy]], [[Marketing]], [[Corporate]], [[Insurance]], [[Supabase]]

---

## Key Pages

| Page | File | Category |
|------|------|---------|
| Reports | `src/pages/Reports.tsx` | General |
| Reports Simple | `src/pages/ReportsSimple.tsx` | Simplified view |
| Financial Summary | `src/pages/FinancialSummary.tsx` | Financial |
| Bill Aging Statement | `src/pages/BillAgingStatement.tsx` | Financial |
| Day-wise Bills | `src/pages/DaywiseBills.tsx` | Financial |
| Day Book | `src/pages/DayBook.tsx` | Financial |
| Activity Log | `src/pages/ActivityLog.tsx` | Audit |
| Death Certificate | `src/pages/DeathCertificate.tsx` | Clinical |
| Currently Admitted | `src/pages/CurrentlyAdmittedPatients.tsx` | Operational |
| Marketing Dashboard | `src/pages/MarketingDashboard.tsx` | Marketing |
| Marketing Incentives | `src/pages/MarketingIncentives.tsx` | Marketing |

## Key Hooks

| Hook | File |
|------|------|
| Financial summary | `src/hooks/useFinancialSummary.ts` (96KB) |
| Bill aging | `src/hooks/useBillAgingReport.ts` |
| Cash book | `src/hooks/useCashBookQueries.ts` |
| Visits data | `src/hooks/useVisitsData.ts` |
| Lab data | `src/hooks/useLabData.ts` |

---

## Print System

All reports and bills have print-ready templates:

| Component folder | Purpose |
|-----------------|---------|
| `src/components/print/` | Print templates for bills, labels, reports, discharge summaries |

---

## Report Categories

### Financial Reports
- Bill aging (30/60/90/120+ days buckets)
- Day book (all vouchers)
- Day-wise bill summary
- Financial summary dashboard (collection, outstanding, cash)
- Patient ledger statement

### Clinical Reports
- Currently admitted patients census
- Discharge summaries
- Lab trends
- Radiology queue

### Operational Reports
- Marketing performance, incentives
- Corporate billing summary
- Insurance claim summary

### Audit
- Activity log — who did what, when
- Tally sync log — push/pull history
- WhatsApp notification log
