# Tally Integration

#integration #financial

**Purpose:** Bidirectional sync layer between adamrit (Supabase) and Tally ERP. Automatically pushes bills/payments as vouchers and pulls ledger/stock master data from Tally.

**Connected to:** [[Accounting]], [[Billing]], [[Pharmacy]], [[Tally ERP]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Tally Integration config | `src/pages/TallyIntegration.tsx` |
| Accounting (Tally Gateway) | `src/pages/Accounting.tsx` |

## Key Services

| File | Size | Purpose |
|------|------|---------|
| `src/lib/tally-xml-service.ts` | 46KB | Core XML builder for all Tally API calls |
| `src/lib/tally-auto-push.ts` | 22KB | Triggers push on bill/payment save |
| `src/lib/tally-reverse-sync.ts` | 9.5KB | Imports master data from Tally |
| `src/services/tallyIntegration.ts` | — | High-level wrapper |
| `api/tally-proxy.ts` | — | Vercel serverless — proxies XML to Tally server |
| `supabase/functions/tally-proxy/` | — | Edge function version of proxy |

## Key Hooks

| Hook | File |
|------|------|
| Tally integration | `src/hooks/useTallyIntegration.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `tally_config` | Tally server IP, port, company name |
| `tally_ledgers` | Pulled ledger master |
| `tally_groups` | Pulled account groups |
| `tally_vouchers` | Synced voucher headers |
| `tally_vouchers_details` | Voucher line items |
| `tally_stock_items` | Pulled inventory items |
| `tally_cost_centres` | Cost center master |
| `tally_gst_data` | GST rates/HSN from Tally |
| `tally_sync_status` | Per-company sync health |
| `tally_sync_log` | Per-transaction push log |
| `tally_export_log` | Push operation history |
| `tally_import_log` | Pull operation history |

---

## Push Flow (Supabase → Tally)

```
Bill saved in Supabase
  └─► tally-auto-push.ts triggered
        └─► tally-xml-service.ts builds XML voucher
              └─► POST to api/tally-proxy
                    └─► Tally server processes XML
                          └─► tally_sync_log updated (success/fail)
```

## Pull Flow (Tally → Supabase)

```
tally-reverse-sync.ts runs
  └─► GET request to Tally (XML export request)
        └─► Tally returns master data (XML)
              └─► Parsed → inserted into:
                    ├─► tally_ledgers
                    ├─► tally_groups
                    ├─► tally_stock_items
                    └─► tally_import_log
```

---

## Voucher Types Supported

| Hospital Transaction | Tally Voucher Type |
|---------------------|-------------------|
| Patient bill | Sales Voucher |
| Payment received | Receipt Voucher |
| Medicine purchase (GRN) | Purchase Voucher |
| Manual journal | Journal Voucher |
| Advance payment | Receipt Voucher |
