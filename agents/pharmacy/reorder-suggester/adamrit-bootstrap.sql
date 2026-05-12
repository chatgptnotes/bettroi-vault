-- =============================================================================
-- Adamrit pharmacy bootstrap — for the reorder-suggester agent
--
-- Run this in Adamrit's SQL editor:
-- https://supabase.com/dashboard/project/xvkxccqaopbnkvwgyfjv/sql/new
--
-- It is fully idempotent — safe to run multiple times.
--
-- What it does:
--   1. Adds stock-management columns to the existing public.medicine_master table
--   2. Creates the public.v_pharmacy_low_stock_alert view (read by the Edge Function)
--   3. Creates the public.agent_audit_log table
--   4. Seeds reorder + minimum thresholds for Atropine and Adrenaline
-- =============================================================================

-- ---- 1. Add stock columns to medicine_master --------------------------------
alter table public.medicine_master
  add column if not exists stock                int default 0,
  add column if not exists reorder_level        int,
  add column if not exists minimum_stock        int,
  add column if not exists maximum_stock        int,
  add column if not exists pack_size            int default 1,
  add column if not exists loose_stock_quantity int default 0,
  add column if not exists shelf_location       text;

create index if not exists idx_medicine_master_reorder
  on public.medicine_master(reorder_level)
  where reorder_level is not null;

create index if not exists idx_medicine_master_stock
  on public.medicine_master(stock);

-- ---- 2. Low-stock alert view ------------------------------------------------
-- This is what the reorder-suggester Edge Function reads.
-- Returns ONLY medicines that are at or below their threshold.

create or replace view public.v_pharmacy_low_stock_alert as
select
    m.id,
    m.medicine_name        as name,
    m.generic_name,
    null::text             as item_code,
    coalesce(m.stock, 0)   as current_stock,
    m.reorder_level,
    m.minimum_stock,
    s.supplier_name,
    null::text             as manufacturer,
    m.shelf_location       as shelf,
    coalesce(m.pack_size, 1) as pack_size
from public.medicine_master m
left join public.suppliers s on s.id = m.supplier_id
where m.is_deleted = false
  and (
    (m.reorder_level is not null and coalesce(m.stock, 0) <= m.reorder_level)
    or (m.minimum_stock is not null and coalesce(m.stock, 0) <= m.minimum_stock)
  )
order by coalesce(m.stock, 0) asc;

-- ---- 3. Audit table ---------------------------------------------------------
-- Every agent invocation writes one row here. DPO-readable, append-only.

create table if not exists public.agent_audit_log (
  id              bigserial primary key,
  agent           text   not null,
  agent_version   text,
  action          text   not null,
  medicine_id     uuid   references public.medicine_master(id),
  details         jsonb,
  created_at      timestamptz default now()
);

create index if not exists idx_agent_audit_log_agent_created
  on public.agent_audit_log(agent, created_at desc);

-- ---- 4. Seed thresholds for Atropine + Adrenaline --------------------------
-- IDs verified against medicine_master (queried 2026-05-10):
--   d2834fd0-1f28-459a-9bc4-f24d2c2ea80c  — TROPINE AMPULE - ATROPINE SULPHATE 1 ML
--   8797a380-34e3-45db-a06a-3819749b919e  — VASOCON 1MG /1 ML -ADRENALINE INJ
--
-- Per Hope Hospital pharmacy SOP (corpus/pharmacy/inventory-management.md):
--   reorder_level = 500 (trigger PO to Hospurush)
--   minimum_stock = 250 (critical red line — escalate to Pharmacist + Administrator)
--   pack_size     = 10  (typical injection pack)

update public.medicine_master
   set reorder_level = 500,
       minimum_stock = 250,
       pack_size     = 10
 where id in (
   'd2834fd0-1f28-459a-9bc4-f24d2c2ea80c',
   '8797a380-34e3-45db-a06a-3819749b919e'
 );

-- ---- 5. Sanity check --------------------------------------------------------
-- After running the above, this should return 2 rows IF current stock for
-- atropine and adrenaline is <= 500 (the seeded reorder_level).
-- If it returns 0, stock is healthy or hasn't been set yet — populate
-- medicine_master.stock from your dispensing logs to start the loop.

select * from public.v_pharmacy_low_stock_alert;
