# Billing

#financial

**Purpose:** Complete billing lifecycle — bill creation, approval workflows, corporate/insurance billing, payment collection, advance payments, and receivables tracking.

**Connected to:** [[Patient Management]], [[IPD]], [[OPD]], [[Pharmacy]], [[Lab]], [[Radiology]], [[Accounting]], [[Tally Integration]], [[Insurance]], [[Corporate]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Final Bill | `src/pages/FinalBill.tsx` |
| Bill Management | `src/pages/BillManagement.tsx` |
| Bill Submission (approval) | `src/pages/BillSubmission.tsx` |
| Bill Approvals | `src/pages/BillApprovals.tsx` |
| Day-wise Bills | `src/pages/DaywiseBills.tsx` |
| Advance Payment | `src/pages/AdvancePayment.tsx` |
| Daily Payment Allocation | `src/pages/DailyPaymentAllocation.tsx` |
| Bill Aging Statement | `src/pages/BillAgingStatement.tsx` |
| Patient Ledger | `src/pages/PatientLedger.tsx` |
| Corporate Bulk Payments | `src/pages/CorporateBulkPayments.tsx` |

## Key Components

| Component | Purpose |
|-----------|---------|
| `src/components/` (billing-related) | Bill line item builder, payment modal |

## Key Hooks

| Hook | File |
|------|------|
| Billing data | `src/hooks/useFinancialSummary.ts` (96KB) |
| Aging report | `src/hooks/useBillAgingReport.ts` |
| Payment service | `src/lib/payment-service.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `bills` | Bill header (invoice) |
| `bill_items` | Bill line items |
| `bill_line_items` | Detailed line items |
| `outstanding_invoices` | Receivables tracker |
| `payment_transactions` | Payment records |
| `payment_allocations` | Payment applied against specific bills |
| `patient_ledgers` | Running patient account balance |
| `aging_snapshots` | Point-in-time aged receivables |
| `daily_balances` | Daily closing balance |
| `advance_payments` | Advance money collected |

---

## Key Workflows

```
Bill Creation
  └─► Bill approved (BillSubmission workflow)
        └─► Outstanding invoice tracked
              ├─► Payment received → payment_transactions
              │     └─► Allocated → payment_allocations
              │           └─► Ledger updated
              └─► Auto-pushed to Tally → [[Tally Integration]]
```

## Bill Types

- OPD consultation bill
- IPD discharge bill
- Pharmacy counter sale
- Corporate package bill
- Insurance (Ayushman/CGHS/ESIC/HOPE) bill
- Advance payment receipt
