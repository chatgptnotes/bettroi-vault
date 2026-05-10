---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [agent, schema, adamrit, integration]
---

# Adamrit ↔ Reorder Agent — schema mapping

Confirmed against the canonical DDL at `github.com/chatgptnotes/adamrit/blob/main/2_CREATE_PHARMACY_TABLES.sql` (commit checked 2026-05-10).

## Source of truth in Adamrit

| Concept | Adamrit object | Notes |
|---|---|---|
| Master drug catalog | `public.medication` (1,071 rows) | Use `name`, `generic_name`, `item_code`, `barcode` |
| Current stock | `public.medication.stock` (text, cast to int) | Updated by sales/dispense triggers |
| Reorder threshold | `public.medication.reorder_level` (int) | Per-medicine override |
| Critical floor | `public.medication.minimum_stock` (int) | "Red line" — anything below should escalate |
| Pack size | `public.medication.pack_size` (int, default 1) | Suggested qty rounds UP to multiples |
| Loose units | `public.medication.loose_stock_quantity` | Track partial packs |
| Pre-filtered low-stock list | `public.v_pharmacy_low_stock_alert` (view) | What the agent reads — already filtered |
| Suppliers | `public.suppliers` (17 rows) | `supplier_name`, `supplier_code`, `credit_day`, `credit_limit` |
| Goods received | `public.grn_items` (2,014 rows) | Has batch_number, expiry_date, ordered/received/accepted |
| Purchase orders | `public.purchase_orders` (203 rows) + `purchase_order_items` | Header + line items |

## Existing low-stock view (we read this directly)

```sql
CREATE OR REPLACE VIEW public.v_pharmacy_low_stock_alert AS
SELECT m.id, m.name, m.generic_name, m.item_code,
       CAST(m.stock AS INTEGER) AS current_stock,
       m.reorder_level, m.minimum_stock,
       m.supplier_name, m.manufacturer, m.shelf
FROM public.medication m
WHERE m.is_deleted = FALSE
  AND ((m.reorder_level IS NOT NULL AND CAST(m.stock AS INTEGER) <= m.reorder_level)
       OR (m.minimum_stock IS NOT NULL AND CAST(m.stock AS INTEGER) <= m.minimum_stock))
ORDER BY CAST(m.stock AS INTEGER) ASC;
```

## What Adamrit needs added (one-time SQL — paste into Adamrit's SQL editor)

The agent writes to an audit table that doesn't yet exist in Adamrit. Add it:

```sql
create table if not exists public.agent_audit_log (
  id              bigserial primary key,
  agent           text not null,
  agent_version   text,
  action          text not null,
  medicine_id     uuid references public.medication(id),
  details         jsonb,
  created_at      timestamptz default now()
);

create index if not exists idx_agent_audit_log_agent_created
  on public.agent_audit_log(agent, created_at desc);
```

Optional: extend `purchase_orders` with `triggered_by` and `sop_version` columns for richer audit trail (the agent currently writes that info into `notes` instead).

## Atropine + Adrenaline — confirmed already in Adamrit

| Drug | medication.id | supplier_id | Type |
|---|---|---|---|
| TROPINE AMPULE - ATROPINE SULPHATE 1 ML | `d2834fd0-1f28-459a-9bc4-f24d2c2ea80c` | 4 | Injection |
| VASOCON 1MG /1 ML -ADRENALINE INJ | `8797a380-34e3-45db-a06a-3819749b919e` | 4 | Injection |

Both rows exist but `reorder_level`, `minimum_stock`, and `pack_size` are likely NULL today. Pharmacist must populate these so the view picks them up:

```sql
update public.medication set reorder_level = 500, minimum_stock = 250, pack_size = 10
where id in (
  'd2834fd0-1f28-459a-9bc4-f24d2c2ea80c',  -- atropine
  '8797a380-34e3-45db-a06a-3819749b919e'   -- adrenaline
);
```

## ⚠️ Adamrit RLS gap (must be fixed before going live)

Anon key currently reads 3,492 patient records. Before this agent goes live with a service-role key, the patients/visits/prescriptions tables need RLS policies. Tracked separately — flagged in `decisions/0002-adamrit-rls-gap.md` (TODO).
