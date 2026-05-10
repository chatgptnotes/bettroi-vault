// Pharmacy reorder scan — Supabase Edge Function.
//
// Reads Adamrit's `medicines` table → finds items where current_stock <= reorder_level
// → drafts a Purchase Order (or skips if DRY_RUN) → pings Slack for human approval
// → writes an audit row.
//
// Grounds on the SOPs at corpus/pharmacy/inventory-management.md and reorder-thresholds.md
// (currently hardcoded thresholds; v2 will read the .md from vault Storage and pass to LLM).
//
// Trigger options:
//   - Cron: every 6 hours via supabase scheduled functions
//   - Manual: invoke from CLI or any HTTP client
//   - Webhook: from Adamrit `medicines` table on row update
//
// Env vars (set via `supabase secrets set`):
//   ADAMRIT_SUPABASE_URL              — Adamrit's project URL
//   ADAMRIT_SUPABASE_SERVICE_ROLE_KEY — write access to medicines + purchase_orders + audit log
//   SLACK_WEBHOOK_URL                 — #pharmacy-alerts channel
//   DRY_RUN                           — "true" (default) prevents real PO writes
//   SOP_VERSION                       — date string for audit trail (default: today)

import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Medicine, ReorderSuggestion, ScanResult } from "../_shared/types.ts";
import { postSlack } from "../_shared/slack.ts";

// ----- Pure logic — easy to unit-test -----------------------------------------

export function suggestReorder(med: Medicine): ReorderSuggestion {
  // Default monthly demand proxy: assume reorder_level is a 30-day buffer.
  // Order enough to bring stock to 2× reorder_level (60 days), rounded up to pack_size.
  const target = med.reorder_level * 2;
  const need = Math.max(1, target - med.current_stock);
  const pack = med.pack_size ?? 1;
  const packs = Math.ceil(need / pack);
  const suggested_qty = packs * pack;

  // Critical categories per corpus/pharmacy/inventory-management.md §2 + reorder-thresholds.md
  const isEmergency = ["adrenaline", "atropine", "epinephrine", "naloxone"]
    .some((n) => med.name.toLowerCase().includes(n));
  const isControlled = ["H", "H1", "X"].includes(med.schedule ?? "");
  const lowSupply = med.current_stock <= med.reorder_level / 2; // critical red line

  const needs_human = isControlled || (isEmergency && lowSupply);

  const rationale = [
    `current_stock=${med.current_stock}, reorder_level=${med.reorder_level}`,
    `suggested ${suggested_qty} units (${packs}×${pack}-pack) → ~60-day cover`,
    isEmergency ? "EMERGENCY drug" : null,
    isControlled ? `CONTROLLED schedule ${med.schedule}` : null,
    lowSupply ? "BELOW critical red line (50% of threshold)" : null,
  ].filter(Boolean).join(" · ");

  return { medicine: med, suggested_qty, rationale, needs_human };
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

  // Fetch all medicines and filter in JS — Adamrit may have tens of thousands of rows
  // but the "below threshold" set is typically tiny. Adjust to a server-side filter
  // once we confirm Adamrit's schema supports `lte('current_stock', col('reorder_level'))`.
  const { data: meds, error } = await adamrit
    .from("medicines")
    .select("id,name,current_stock,reorder_level,supplier,pack_size,lead_time_days,cold_chain,schedule");
  if (error) return json({ error: `medicines fetch: ${error.message}` }, 500);

  const all: Medicine[] = meds ?? [];
  const below = all.filter((m) => m.current_stock <= m.reorder_level);

  for (const med of below) {
    try {
      const sug = suggestReorder(med);

      // 1. Slack alert
      const supplier = med.supplier ?? "<no-supplier>";
      const prefix = dryRun ? "DRY RUN — " : "";
      const ok = await postSlack(
        `${prefix}⚠️ *${med.name}* at ${med.current_stock} units (threshold ${med.reorder_level}). ` +
        `Suggested PO: ${sug.suggested_qty} units → ${supplier}. ` +
        `${sug.needs_human ? "🚨 Requires human approval — " : ""}Rationale: ${sug.rationale}`,
      );
      if (ok) alerts += 1;

      // 2. Draft PO (skipped in dry run)
      if (!dryRun) {
        const { error: poErr } = await adamrit.from("purchase_orders").insert({
          medicine_id: med.id,
          supplier: med.supplier,
          quantity: sug.suggested_qty,
          status: sug.needs_human ? "pending_approval" : "auto_dispatched",
          triggered_by: "reorder-suggester-agent",
          sop_version: sopVersion,
          rationale: sug.rationale,
          created_at: new Date().toISOString(),
        });
        if (poErr) {
          errors.push(`PO ${med.name}: ${poErr.message}`);
          continue;
        }
        drafted += 1;
      }

      // 3. Audit log (best-effort — table may not exist yet)
      await adamrit.from("agent_audit_log").insert({
        agent: "reorder-suggester",
        agent_version: sopVersion,
        action: dryRun ? "scan_dry_run" : "po_drafted",
        medicine_id: med.id,
        details: {
          current_stock: med.current_stock,
          suggested_qty: sug.suggested_qty,
          needs_human: sug.needs_human,
          rationale: sug.rationale,
        },
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn(`audit log skip: ${error.message}`);
      });
    } catch (err) {
      errors.push(`${med.name}: ${(err as Error).message}`);
    }
  }

  // Summary ping at end of scan
  await postSlack(
    `📋 Pharmacy reorder scan complete (SOP v${sopVersion}, ${dryRun ? "DRY RUN" : "LIVE"}): ` +
    `checked ${all.length} medicines · ${below.length} below threshold · ` +
    `${drafted} POs drafted · ${alerts} alerts sent` +
    (errors.length ? ` · ⚠️ ${errors.length} errors` : ""),
  );

  const result: ScanResult = {
    scanned_at: new Date().toISOString(),
    total_medicines_checked: all.length,
    below_threshold: below.length,
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
