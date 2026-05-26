# System Overview

#architecture

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3 + Vite 5 + TypeScript 5.9 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase JWT (multi-hospital row-level security) |
| Server-side APIs | Vercel Serverless Functions (`api/`) |
| Background Jobs | Supabase Edge Functions (`supabase/functions/`) |
| Accounting ERP | Tally Prime (XML over HTTP) |
| Communications | Twilio REST API + DoubleTick WhatsApp |
| AI | OpenAI GPT API |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React + Vite)                       │
│                                                                     │
│  Auth Context → Role Guard → Pages (122) → Components (50+ mod)    │
│                          ↕                                          │
│              React Query Hooks (50+ hooks)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS
              ┌────────────┼──────────────────┐
              │            │                  │
    ┌─────────▼────┐  ┌────▼──────────┐  ┌───▼─────────────┐
    │ Supabase SDK │  │ Vercel API    │  │ Supabase Edge   │
    │ (TypeScript) │  │ Routes        │  │ Functions       │
    └─────────┬────┘  └────┬──────────┘  └───┬─────────────┘
              │            │                  │
    ┌─────────▼────────────▼──────────────────▼─────────────┐
    │                  SUPABASE                              │
    │  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐  │
    │  │ PostgreSQL  │  │  Auth    │  │    Realtime      │  │
    │  │ (150+ tbls) │  │  JWT     │  │  Subscriptions   │  │
    │  └─────────────┘  └──────────┘  └──────────────────┘  │
    └────────────────────────────────────────────────────────┘
              │            │                  │
    ┌─────────▼──┐   ┌─────▼──────┐   ┌──────▼──────────────┐
    │ Tally ERP  │   │  Twilio    │   │  OpenAI / DoubleTick │
    │ (XML/HTTP) │   │ (REST API) │   │  (REST APIs)         │
    └────────────┘   └────────────┘   └──────────────────────┘
```

---

## Source Directory Structure

```
src/
├── pages/          # 122 page-level components (one per screen)
├── components/     # Module-specific UI components
│   ├── accounting/
│   ├── lab/
│   ├── pharmacy/
│   ├── radiology/
│   ├── ipd/
│   ├── opd/
│   ├── operation-room/
│   ├── marketing/
│   ├── patient/
│   ├── discharge/
│   ├── print/      # Print templates (bills, labels)
│   ├── tally/      # Tally Gateway UI
│   ├── ui/         # shadcn/ui base components
│   └── shared/
├── hooks/          # 50+ React Query data hooks
├── lib/            # Business logic services
├── services/       # Integration wrappers
├── integrations/supabase/
│   ├── client.ts   # Supabase client init
│   └── types.ts    # Auto-generated DB types (100+ tables)
├── contexts/       # AuthContext, ThemeContext
├── types/          # Domain TypeScript types
└── utils/          # Helper utilities

api/                # Vercel serverless routes
supabase/
├── functions/      # Edge Functions
└── migrations/     # 40+ SQL migration files
```

---

## Multi-Hospital Design

- Every database table has a `hospital_id` column
- Supabase RLS (Row-Level Security) policies enforce per-hospital data isolation
- Login screen shows hospital selector → sets active hospital context
- All queries automatically scoped to the logged-in hospital

---

## See Also

- [[Home]] — full module index
- [[Data Flow]] — end-to-end workflows
- [[Supabase]] — database and auth details
