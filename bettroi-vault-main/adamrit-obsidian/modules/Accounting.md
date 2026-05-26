# Accounting

#financial

**Purpose:** Full accounting module — chart of accounts, vouchers, cash book, day book, patient ledgers, and the Tally Gateway interface. Serves as the financial control center.

**Connected to:** [[Billing]], [[Tally Integration]], [[Tally ERP]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Accounting (main/Tally Gateway) | `src/pages/Accounting.tsx` |
| Cash Book | `src/pages/CashBook.tsx` |
| Day Book | `src/pages/DayBook.tsx` |
| Patient Ledger | `src/pages/PatientLedger.tsx` |
| Bill Aging Statement | `src/pages/BillAgingStatement.tsx` |
| Financial Summary | `src/pages/FinancialSummary.tsx` |
| Tally Integration config | `src/pages/TallyIntegration.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/accounting/` | Voucher entry, ledger viewer, Tally sync UI |
| `src/components/tally/` | Tally Gateway UI (mirror of Tally's interface in browser) |

## Key Hooks

| Hook | File |
|------|------|
| Accounting data | `src/hooks/useAccountingData.ts` |
| Cash book queries | `src/hooks/useCashBookQueries.ts` (21KB) |
| Financial summary | `src/hooks/useFinancialSummary.ts` (96KB) |
| Tally integration | `src/hooks/useTallyIntegration.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `chart_of_accounts` | General ledger accounts |
| `vouchers` | Accounting voucher headers |
| `voucher_entries` | Voucher debit/credit lines |
| `voucher_types` | Voucher type master (Receipt, Payment, Journal, etc.) |
| `voucher_cost_center_allocations` | Cost center split per line |
| `daily_balances` | Daily closing cash/bank |
| `aging_snapshots` | Receivables aging snapshots |
| `tally_ledgers` | Synced Tally ledger master |
| `tally_groups` | Tally account groups |
| `tally_sync_status` | Sync health dashboard |

---

## Key Features

- **Tally Gateway** — browser-based Tally UI (`Accounting.tsx` routes to AccountBooks, Banking, AshokLedger subviews)
- **Cash Book** — daily cash transactions, opening/closing balance
- **Day Book** — all vouchers for a day
- **Patient Ledger** — per-patient account statement
- **Bill Aging** — 30/60/90/120+ day buckets
- **Financial Summary** — dashboard with collection, outstanding, and cash metrics
- **Voucher entry** — manual voucher creation that syncs to Tally
