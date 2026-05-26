---
department: general
agent_pack: ai-first-playbook
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: draft
tags: [playbook, spec, engineering, interactive-tool, stripe]
---

# Be AI-First Playbook — Interactive Tool Spec

Engineering spec for the paid web tool that walks a client through `04-step-by-step.md` interactively. Built on the standard HopeTech stack so it ships in days, not weeks.

---

## Product summary

A paywalled, single-tenant-per-account web app at **hopetech.me/playbook** (or `playbook.hopetech.me`) that:
1. Takes a setup fee via Stripe ($500–$1,500).
2. Unlocks a 10-step guided journey (content from `04-step-by-step.md`).
3. Tracks progress with a slider (0% → 100% → 200%).
4. Fires confetti at every milestone step (Steps 1, 2, 4, 6, 7, 8, 9, 10).
5. Surfaces relevant FAQs (`01-faqs.md`) inline next to each step.
6. Has a "**Talk to us**" CTA always visible — opens Slack Connect channel OR books a HopeTech call.
7. Captures every action as an event for HopeTech sales team to see who's stuck where.

**Goal:** reduce time-to-revenue by replacing manual sales onboarding calls with a self-serve flow that pre-qualifies and pre-activates the client *before* the Discovery Sprint kickoff.

---

## Stack (matches HopeTech standard)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + React + TypeScript | HopeTech standard (Linkist NFC, DrmHope, bni121) |
| Styling | Tailwind + shadcn/ui | Fast, consistent |
| Auth | Supabase Auth (magic link) | Frictionless; no password reset support burden |
| DB | Supabase Postgres | Standard tenant DB |
| Payments | **Stripe Checkout + Customer Portal** | Linkist already wires this; reuse the pattern |
| Hosting | Vercel | Standard |
| Confetti | `canvas-confetti` (npm) | Lightweight, no React-specific lock-in |
| Progress slider | Headless UI / shadcn Progress | Native shadcn |
| Email | Resend | Magic links + Champion invites |
| Analytics | PostHog | Funnel + drop-off per step |
| Slack notifications | Incoming webhook → `#agents-output` (HopeTech side) | New unlocks, drop-offs, "Talk to us" clicks |

**Total monthly cost to run** (HopeTech side, modest scale): ~$70/month (Vercel Pro $20 + Supabase Pro $25 + Stripe pay-per-txn + Resend $20).

---

## Data model (Supabase)

```sql
-- Client account (one per paying customer)
create table client_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company_name text,
  industry text,
  team_size int,
  setup_fee_cents int not null,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  unlocked_at timestamptz,
  created_at timestamptz default now()
);

-- Per-step progress
create table step_progress (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references client_accounts(id) on delete cascade,
  step_number int not null check (step_number between 1 and 10),
  status text not null check (status in ('locked','unlocked','in_progress','completed','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  payload jsonb,                  -- tool inventory, workflow map, etc.
  unique (account_id, step_number)
);

-- Events for analytics + sales visibility
create table playbook_events (
  id bigserial primary key,
  account_id uuid references client_accounts(id) on delete cascade,
  event_type text not null,       -- 'step_started','step_completed','talk_to_us_clicked','stuck'
  step_number int,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Stretch-goal badges
create table stretch_badges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references client_accounts(id) on delete cascade,
  badge_slug text not null,       -- 'token-max','multiplier','contributor', etc.
  awarded_at timestamptz default now(),
  unique (account_id, badge_slug)
);
```

RLS: each `client_accounts` row gates access to its own `step_progress`, `playbook_events`, `stretch_badges`. Service role for HopeTech sales dashboard.

---

## Page map

```
/                      → Marketing page + "Get Started" CTA → Stripe Checkout
/checkout/success      → Webhook confirms payment → magic link sent → /dashboard
/dashboard             → Progress slider + 10 step cards (locked/unlocked) + Talk-to-us
/dashboard/step/[1-10] → Step detail: instructions + form + screenshot + FAQ panel
/dashboard/badges      → Stretch goals (100%–200% target)
/admin                 → HopeTech-only sales dashboard (RLS service-role)
```

---

## Confetti & progress UX

**Progress slider:**
- 0% → 100% across the 10 mandatory steps. Each step = 10%.
- 100% → 200% via stretch badges (`04-step-by-step.md` "Stretch goals" section).
- Slider colour transitions: red (0–30%) → amber (30–70%) → green (70–100%) → gold (100–200%).
- Pinned at top of `/dashboard`. Tooltip on hover: "You are X% on the way to becoming an AI-Native company."

**Confetti triggers** (use `canvas-confetti`):

| Step | Trigger | Intensity |
|---|---|---|
| 1 | Payment confirmed → unlock | Medium burst |
| 2 | Tool & workflow audit complete | Medium |
| 4 | Phase 1 (Learn) complete | Large |
| 6 | Business Brain LIVE | Large + custom message overlay |
| 7 | First production agent | XL — fireworks pattern |
| 8 | All departmental agents shipped | XL |
| 9 | Intelligence layer live | Large |
| 10 | Scale Retainer signed | XXL — "AI-First Company" badge animation + email to leadership |
| Each stretch badge | Badge unlock | Small + badge SVG flip animation |

Use `motion/react` (Framer Motion successor) for badge animations. No video — keeps bundle small.

---

## "Talk to us" implementation

Always-visible floating button (bottom-right). On click, modal with three options:

1. **Slack** — opens Slack Connect invite link (one shared channel per client account; channel created on first unlock via Slack API).
2. **Book a call** — Cal.com embed (15-min, 30-min, 90-min options; the 90-min one IS the Discovery Session and pre-fills the booking).
3. **Email** — `mailto:cmd@hopehospital.com` with account context pre-filled in subject.

Every "Talk to us" click fires a `playbook_events` row + Slack notification to `#agents-output` so HopeTech sales sees the signal in real time.

---

## Stripe integration (key flows)

**Initial setup-fee payment:**
1. `/` → Stripe Checkout Session (one-time payment).
2. Stripe webhook `checkout.session.completed` → create `client_accounts` row, send magic link via Resend.
3. Idempotency key on the `payment_intent_id`.

**Optional credit-toward-Discovery:**
- If client converts to a Discovery Sprint within 30 days, auto-apply setup fee as a Stripe Coupon on the Discovery invoice.
- Track via `client_accounts.unlocked_at` + a `discovery_invoice_id` column when issued.

**Refund policy:** unconditional refund within 7 days of unlock if no step beyond Step 1 has been completed.

---

## Security & compliance

- Magic-link auth only (no passwords); Supabase Auth handles JWT rotation.
- All `client_accounts` rows gated by RLS on `auth.uid()`.
- Stripe webhook signature verified on every webhook call.
- No PHI/PII enters this app — it only collects company-level data (tool inventory, workflow names). Reinforce in privacy policy.
- HopeTech admin access via service role + IP allowlist on the `/admin` route.

---

## Sales/ops feedback loop

Every event flows to HopeTech `#agents-output` Slack channel:
- New unlock: "🔓 Acme Inc. (healthcare, 8 people) just paid setup fee."
- Step completed: "✅ Acme just shipped Step 6 — Business Brain LIVE. They're at 60%."
- Stuck signal (>72h on same step with no events): "⚠️ Acme stuck on Step 4 for 4 days. Reach out."
- Talk-to-us click: "📞 Acme clicked Talk-to-us on Step 7. Pick this up, sales team."

---

## MVP build estimate

Single Next.js engineer pairing with one HopeTech designer:

| Sprint | Days | Output |
|---|---|---|
| 1 | 3 days | Stripe + auth + dashboard skeleton + 1 step working end-to-end |
| 2 | 3 days | All 10 steps wired with content from `04-step-by-step.md` + confetti + progress |
| 3 | 2 days | Talk-to-us + Slack notifications + admin dashboard + analytics |
| 4 | 2 days | QA, screenshots integrated, polish, soft launch to one beta client |

**Total: ~10 working days** to first paying client. Fits the DrmHope "6-week ship" promise comfortably.

---

## Open questions for `cmd@hopehospital.com`

Capture answers before build kicks off (these can become `decisions/` ADRs):

1. Setup fee price point: **$500, $999, or $1,500**? (Pricing affects positioning.)
2. Domain: **playbook.hopetech.me** or **/playbook** path on hopetech.me?
3. Slack Connect: do we want one shared channel per client, or one master `#playbook-clients` channel? (One-per-client scales cleaner; more channels.)
4. Stretch badges: do we expose all 6 from day one, or unlock progressively (1 per quarter retainer cycle)?
5. Refund window: 7 days as proposed, or shorter (e.g. 48h)?
