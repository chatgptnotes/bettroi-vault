// Pharmacy reorder scan — Supabase Edge Function.
//
// Reads Adamrit's pre-built view `v_pharmacy_low_stock_alert` (which already
// returns medications where stock <= reorder_level OR stock <= minimum_stock).
// For each row: drafts a Purchase Order, pings Slack, writes audit row.
//
// Adamrit pharmacy DDL: github.com/chatgptnotes/adamrit/blob/main/2_CREATE_PHARMACY_TABLES.sql
//   - Table: public.medication  (NOT "medicines")
//   - View:  public.v_pharmacy_low_stock_alert (returns: id, name, current_stock,
//            reorder_level, minimum_stock, supplier_name, manufacturer, shelf)
//
// Grounds on SOPs: corpus/pharmacy/inventory-management.md + reorder-thresholds.md
//
// Env vars (set via `supabase secrets set`):
//   ADAMRIT_SUPABASE_URL              — Adamrit's project URL
//   ADAMRIT_SUPABASE_SERVICE_ROLE_KEY — write access to medication + purchase_orders + agent_audit_log
//   SLACK_WEBHOOK_URL                 — #pharmacy-alerts channel
//   DRY_RUN                           — "true" (default) prevents real PO writes
//   SOP_VERSION                       — date string for audit trail (default: today)

import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Medication, ReorderSuggestion, ScanResult } from "../_shared/types.ts";
import { postSlack } from "../_shared/slack.ts";

// ----- Pure logic — easy to unit-test -----------------------------------------

export function suggestReorder(med: Medication): ReorderSuggestion {
  const threshold = med.reorder_level ?? med.minimum_stock ?? 0;

  // Order enough to bring stock to 2× threshold (~60-day cover), rounded up to pack_size.
  const target = threshold * 2;
  const need = Math.max(1, target - med.current_stock);
  const pack = med.pack_size ?? 1;
  const packs = Math.ceil(need / pack);
  const suggested_qty = packs * pack;

  // Critical categories per corpus/pharmacy/inventory-management.md §2 + reorder-thresholds.md
  const lower = med.name.toLowerCase();
  const isEmergency = ["adrenaline", "atropine", "epinephrine", "naloxone", "noradrenaline"]
    .some((n) => lower.includes(n));

  // Below the "Critical Red Line" — minimum_stock is the floor; <50% of reorder_level is also red
  const belowMin = med.minimum_stock != null && med.current_stock <= med.minimum_stock;
  const belowHalfThreshold = threshold > 0 && med.current_stock <= threshold / 2;
  const lowSupply = belowMin || belowHalfThreshold;

  // Auto-dispatch is fine for routine; emergency drugs at low supply need human eyes
  const needs_human = isEmergency && lowSupply;

  const rationale = [
    `current_stock=${med.current_stock}, reorder_level=${med.reorder_level ?? "-"}, minimum_stock=${med.minimum_stock ?? "-"}`,
    `suggested ${suggested_qty} units (${packs}×${pack}-pack) → ~60-day cover`,
    isEmergency ? "EMERGENCY drug" : null,
    lowSupply ? "BELOW critical red line" : null,
  ].filter(Boolean).join(" · ");

  return { medication: med, suggested_qty, rationale, needs_human };
}

// ----- Main handler ----------------------------------------------------------

Deno.serve(async (_req) => {
  const dryRun = (Deno.env.get("DRY_RUN") ?? "true").toLowerCase() !== "false";
  const sopVersion = Deno.env.get("SOP_VERSION") ?? new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  let drafted = 0;
  let alerts = 0;

  const adamritUrl = Deno.env.get("ADAMRIT_SUPABASE_URL");
  const adamritKey = Deno.env.get("ADAMRIT_SUPABASE_SERVICE_ROLE_KEY");
  if (!adamritUrl || !adamritKey) {
    return json({ error: "ADAMRIT_SUPABASE_URL and ADAMRIT_SUPABASE_SERVICE_ROLE_KEY required" }, 500);
  }
  const adamrit = createClient(adamritUrl, adamritKey, { auth: { persistSession: false } });

  // Adamrit's pre-built view returns only rows that ARE below threshold,
  // already joined to suppliers and including pack_size from medicine_master.
  // Saves us from reading the full catalog (1,071 rows).
  const { data: rows, error } = await adamrit
    .from("v_pharmacy_low_stock_alert")
    .select("id,name,generic_name,item_code,current_stock,reorder_level,minimum_stock,supplier_name,manufacturer,shelf,pack_size");
  if (error) return json({ error: `low-stock view fetch: ${error.message}` }, 500);

  const below: Medication[] = rows ?? [];

  for (const med of below) {
    try {
      const sug = suggestReorder(med);
      const supplier = med.supplier_name ?? "<no-supplier>";
      const prefix = dryRun ? "DRY RUN — " : "";

      // 1. Slack alert
      const ok = await postSlack(
        `${prefix}⚠️ *${med.name}* at ${med.current_stock} units` +
        ` (reorder ${med.reorder_level ?? "-"}, min ${med.minimum_stock ?? "-"}, shelf ${med.shelf ?? "-"}). ` +
        `Suggested PO: ${sug.suggested_qty} units → ${supplier}. ` +
        `${sug.needs_human ? "🚨 Requires human approval — " : ""}` +
        `Rationale: ${sug.rationale}`,
      );
      if (ok) alerts += 1;

      // 2. Draft PO (skipped in dry run). Adamrit's purchase_orders schema:
      //    po_number (text), supplier_id (int), order_date, status, notes, totals, etc.
      //    For now we insert a header-only PO with status='Draft' and a marker note.
      //    purchase_order_items insertion is a v2 task once we agree on totals/MRP source.
      if (!dryRun) {
        const { error: poErr } = await adamrit.from("purchase_orders").insert({
          po_number: `AGENT-${Date.now()}-${med.id.slice(0, 8)}`,
          order_for: "Pharmacy",
          status: sug.needs_human ? "pending_approval" : "Draft",
          notes: `Auto-drafted by reorder-suggester agent (SOP v${sopVersion}). ` +
                 `Item: ${med.name} · Qty: ${sug.suggested_qty}. ${sug.rationale}`,
          order_date: new Date().toISOString(),
        });
        if (poErr) {
          errors.push(`PO ${med.name}: ${poErr.message}`);
          continue;
        }
        drafted += 1;
      }

      // 3. Audit log (best-effort — table may not exist yet in Adamrit)
      await adamrit.from("agent_audit_log").insert({
        agent: "reorder-suggester",
        agent_version: sopVersion,
        action: dryRun ? "scan_dry_run" : "po_drafted",
        medicine_id: med.id,
        details: {
          name: med.name,
          current_stock: med.current_stock,
          reorder_level: med.reorder_level,
          minimum_stock: med.minimum_stock,
          suggested_qty: sug.suggested_qty,
          needs_human: sug.needs_human,
          supplier_name: med.supplier_name,
          rationale: sug.rationale,
        },
        created_at: new Date().toISOString(),
      }).then(({ error: auditErr }) => {
        if (auditErr) console.warn(`audit log skip: ${auditErr.message}`);
      });
    } catch (err) {
      errors.push(`${med.name}: ${(err as Error).message}`);
    }
  }

  // Summary ping at end of scan
  await postSlack(
    `📋 Pharmacy reorder scan (SOP v${sopVersion}, ${dryRun ? "DRY RUN" : "LIVE"}): ` +
    `${below.length} medications below threshold · ` +
    `${drafted} POs drafted · ${alerts} alerts sent` +
    (errors.length ? ` · ⚠️ ${errors.length} errors` : ""),
  );

  const result: ScanResult = {
    scanned_at: new Date().toISOString(),
    total_medications_below_threshold: below.length,
    drafted_pos: drafted,
    alerts_sent: alerts,
    dry_run: dryRun,
    errors,
  };
  return json(result, errors.length ? 207 : 200);
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
