# Architecture — Adamrit

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Build tool | Vite | `^5.4.19` |
| Framework | React | `^18.3.1` |
| Language | TypeScript | `^5.9.2` |
| UI primitives | shadcn-ui (Radix) | various `@radix-ui/*` |
| Styling | Tailwind CSS | `^3.4.11` |
| Router | react-router-dom | `^6.26.2` |
| Data / state | @tanstack/react-query | `^5.56.2` |
| Forms | react-hook-form + Zod | `^7.53.0` / `^3.23.8` |
| Backend | Supabase | `@supabase/supabase-js ^2.50.0` |
| Charts | recharts | `^2.12.7` |
| PDF / print | jsPDF + html2canvas + react-to-print | — |
| Excel / CSV | exceljs + xlsx + csv-parse | — |
| Editor | CKEditor 5 | `^41.4.2` |
| Drag-drop | dnd-kit | `^6.3.1` |
| Auth helpers | bcryptjs | `^3.0.2` |
| Communication | twilio | `^5.12.2` |
| Deployment | Vercel (`@vercel/node`) | `^5.6.11` |
| E2E tests | Playwright | `^1.59.1` |

Node engine: `>=18.0.0`, npm `>=8.0.0`.

## Top-level layout (`/`)

```
adamrit.com/
├── src/                       React app (entry: src/main.tsx → src/App.tsx)
│   ├── pages/                 137 route components (one per screen)
│   ├── components/            ~96 reusable UI components
│   ├── hooks/                 ~49 custom hooks (data-fetching + state)
│   ├── lib/                   utility libraries (date helpers, formatters)
│   ├── contexts/              React context providers (auth, hospital, theme)
│   ├── types/                 ~30 TypeScript type definitions
│   ├── utils/                 pure helper functions
│   ├── services/              API / business-logic wrappers
│   ├── queries/               react-query hooks (data fetching)
│   ├── integrations/supabase/ Supabase client + generated types
│   └── App.tsx                top-level routing + providers
├── api/                       Vercel serverless functions (Node)
├── supabase/                  SQL migrations (331 files) + seed scripts
├── supabase-migrations/       archived migration set
├── docs/                      PRINT_SYSTEM.md
├── scripts/                   build helpers (check-finalbill-locked, generate-types, tally sync)
├── e2e/                       Playwright tests
├── public/                    static assets
├── vite.config.ts             build config (React SWC plugin)
├── tsconfig.json              TypeScript strict mode
├── package.json               deps + npm scripts
├── CLAUDE.md                  project + Ironbark skill catalog
└── README.md                  quick start
```

## Entry points

- **`src/main.tsx`** — Vite + React 18 hydration root.
- **`src/App.tsx`** — global providers (QueryClient, auth context, hospital context, theme, sidebar), all `<Route>` declarations, layout shell.
- **`src/components/AppRoutes.tsx`** — split-out route table referenced by `App.tsx`.
- **`src/components/AppSidebar.tsx`** — primary navigation; defines which routes appear in the sidebar (see `PMJAY/MJPJAY` recent fix at commit `727cf81`).

## Build & dev

```
npm run dev          # Vite dev server (HMR)
npm run build        # production build (runs check:finalbill first)
npm run build:dev    # dev-mode build
npm run lint         # ESLint
npm run preview      # preview the built bundle locally
```

See [[Build-and-Deploy]] for the full script list and deployment flow.

## Data flow

```
React component
   ↓
useFooData() hook (src/hooks/)
   ↓
react-query (cache + refetch)
   ↓
Supabase client (src/integrations/supabase/)
   ↓
Supabase Postgres + RLS policies
```

Heavy domain hooks: [[Components-and-Hooks]] catalogs all of them.

## Schema

Database structure and migration history → [[Supabase-Schema]].

## Domain glossary

ESIC, CGHS, PMJAY, MJPJAY, OPD, IPD, GRN, PO, RMO definitions → [[hospital-abbreviations]].
