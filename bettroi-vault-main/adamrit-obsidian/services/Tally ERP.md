# Tally ERP

#service #accounting #external

**Purpose:** External accounting ERP that serves as the primary GL (General Ledger) for the hospital. All financial transactions in adamrit sync bidirectionally with Tally.

**Connected to:** [[Tally Integration]], [[Accounting]], [[Billing]]

---

## Integration Protocol

| Property | Detail |
|----------|--------|
| Protocol | XML over HTTP (Tally Developer XML API) |
| Direction | Bidirectional (push + pull) |
| Config table | `tally_config` (stores Tally server IP/port) |
| Env var | `TALLY_EXPORT_DIR` (path for Tally XML exports) |

---

## What Gets Synced

### Supabase → Tally (Push)
- Hospital bills → Tally Sales Vouchers
- Payments → Tally Receipt Vouchers
- Purchases/GRN → Tally Purchase Vouchers
- Journal entries → Tally Journal Vouchers

### Tally → Supabase (Pull)
- Ledger master data → `tally_ledgers`
- Group master → `tally_groups`
- Stock items → `tally_stock_items`
- Cost centres → `tally_cost_centres`
- GST configuration → `tally_gst_data`

---

## Data Tables in Supabase

| Table | Purpose |
|-------|---------|
| `tally_config` | Tally server connection details |
| `tally_ledgers` | Synced ledger master |
| `tally_groups` | Tally account groups |
| `tally_vouchers` | Synced voucher headers |
| `tally_vouchers_details` | Voucher line items |
| `tally_stock_items` | Inventory/medicine master from Tally |
| `tally_cost_centres` | Cost center master |
| `tally_gst_data` | GST rates and configuration |
| `tally_sync_status` | Current sync health per company |
| `tally_sync_log` | Per-transaction sync log |
| `tally_export_log` | Push operation history |
| `tally_import_log` | Pull operation history |

---

## Key Services

| File | Role |
|------|------|
| `src/lib/tally-xml-service.ts` (46KB) | Core XML API builder — formats all Tally XML requests |
| `src/lib/tally-auto-push.ts` (22KB) | Auto-sync on bill save |
| `src/lib/tally-reverse-sync.ts` (9.5KB) | Pull/import from Tally |
| `src/services/tallyIntegration.ts` | High-level integration wrapper |
| `api/tally-proxy.ts` | Vercel route that proxies XML to Tally server |
| `supabase/functions/tally-proxy/` | Edge function version of proxy |

---

## Features Supported

- Multi-company Tally setup
- GST vouchers with HSN/SAC codes
- Cost center allocation per transaction
- Batch sync with retry on failure
- Sync status dashboard in [[Accounting]] module
