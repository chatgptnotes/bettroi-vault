# pharmacy-reorder-scan — Supabase Edge Function

Reads live stock from Adamrit's Supabase, compares against the reorder thresholds in this vault's SOP (`corpus/pharmacy/inventory-management.md` + `reorder-thresholds.md`), drafts a Purchase Order, and pings `#pharmacy-alerts` for human approval.

**Default mode is DRY RUN** — Slack alerts fire but no real PO writes happen until `DRY_RUN=false` is set.

## Architecture

```
        cron (every 6h) ──► invoke ──► this function
                                          │
              ┌───────────────────────────┼────────────────────────┐
              ▼                           ▼                        ▼
     Adamrit Supabase            Slack #pharmacy-alerts    agent_audit_log
     (medicines, POs)            (human approval flow)     (scan history)
```

## Deploy

Prerequisites: `brew install supabase/tap/supabase` then `supabase login`.

```bash
cd /Users/murali/BeBrain/bettroi-vault

# One-time link to the vault Supabase (where this function lives)
supabase link --project-ref bvaefzcsgtgqwftczixb

# Set secrets — these stay encrypted in Supabase, never in git
supabase secrets set \
  ADAMRIT_SUPABASE_URL="https://<adamrit-project>.supabase.co" \
  ADAMRIT_SUPABASE_SERVICE_ROLE_KEY="<adamrit-service-role-key>" \
  SLACK_WEBHOOK_URL="https://hooks.slack.com/services/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" \
  DRY_RUN="true" \
  SOP_VERSION="2026-05-10"

# Deploy
supabase functions deploy pharmacy-reorder-scan --no-verify-jwt
```

## Test (one-shot)

```bash
curl -X POST "https://bvaefzcsgtgqwftczixb.supabase.co/functions/v1/pharmacy-reorder-scan" \
  -H "Authorization: Bearer <vault-anon-key>"
```

Response (example):

```json
{
  "scanned_at": "2026-05-10T16:50:00Z",
  "total_medicines_checked": 412,
  "below_threshold": 3,
  "drafted_pos": 0,
  "alerts_sent": 3,
  "dry_run": true,
  "errors": []
}
```

You should see 4 Slack messages: 3 per-medicine alerts + 1 summary ping.

## Schedule (cron, every 6 hours)

```bash
supabase functions deploy pharmacy-reorder-scan --no-verify-jwt --schedule "0 */6 * * *"
```

## Going live (after pharmacist sign-off)

```bash
supabase secrets set DRY_RUN="false"
```

Once flipped, every scan that finds a below-threshold medicine will:
- Insert a row into `purchase_orders` with `status='pending_approval'` (or `auto_dispatched` for non-emergency, non-controlled)
- Post the alert to Slack
- Write an audit row tagged with `sop_version` (the date in this folder's `last_reviewed` frontmatter)

## Schema expected in Adamrit Supabase

```sql
-- Required
create table medicines (
  id              uuid primary key,
  name            text not null,
  current_stock   int  not null default 0,
  reorder_level   int  not null,
  supplier        text,
  pack_size       int  default 1,
  lead_time_days  int,
  cold_chain      boolean default false,
  schedule        text  -- H | H1 | X | (null for OTC)
);

create table purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  medicine_id     uuid references medicines(id),
  supplier        text,
  quantity        int  not null,
  status          text not null check (status in
                    ('pending_approval','auto_dispatched','dispatched','received','cancelled')),
  triggered_by    text,
  sop_version     text,
  rationale       text,
  approved_by     text,
  approved_at     timestamptz,
  created_at      timestamptz default now()
);

create table agent_audit_log (
  id              bigserial primary key,
  agent           text not null,
  agent_version   text,
  action          text not null,
  medicine_id     uuid references medicines(id),
  details         jsonb,
  created_at      timestamptz default now()
);
```

If Adamrit doesn't have these yet, paste the above into Adamrit's Supabase SQL editor.

## Roadmap

- **v2** — read SOPs from this vault's Storage `agent-corpus` bucket and pass to Claude/Gemini for richer per-medicine reasoning (instead of hardcoded heuristics).
- **v3** — Slack interactive buttons (Approve / Decline / Modify Qty) writing back via a sibling Edge Function `pharmacy-po-approve`.
- **v4** — multi-tenant: scan multiple hospital tenants, each with their own Adamrit project + vault SOP.
