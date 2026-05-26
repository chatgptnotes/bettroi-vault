# Marketing

#admin

**Purpose:** Marketing management — referral tracking, campaign management, marketing user management, and incentive calculation for referring doctors/agents.

**Connected to:** [[Patient Management]], [[Corporate]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Marketing | `src/pages/Marketing.tsx` |
| Marketing Dashboard | `src/pages/MarketingDashboard.tsx` |
| Marketing Incentives | `src/pages/MarketingIncentives.tsx` |

## Key Components

| Component folder | Purpose |
|-----------------|---------|
| `src/components/marketing/` | Marketing UI, incentive calculators |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `marketing_users` | Marketing staff/agents master |
| `marketing_camps` | Campaign definitions |
| `referees` | Referring doctor/agent master |

---

## Key Features

- **Referral tracking** — which doctor/agent referred each patient
- **Campaign management** — define marketing campaigns, track reach
- **Incentive calculation** — calculate commissions/incentives per referral
- **Marketing dashboard** — performance metrics per marketing user
- **Corporate link** — marketing connects referred patients to corporate accounts
