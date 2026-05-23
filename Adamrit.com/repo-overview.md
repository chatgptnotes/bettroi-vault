---
domain: adamrit.com
repo: chatgptnotes/adamrit
default_branch: main
last_push: 2026-05-23T05:47:59Z
size_kb: 37223
language: TypeScript
description: ""
extracted: 2026-05-23T06:50:43.655Z
---
# Hospital Management System — `adamrit.com`

**Live URL:** https://adamrit.com/
**GitHub repo:** https://github.com/chatgptnotes/adamrit
**Default branch:** `main`  ·  **Last push:** 2026-05-23T05:47:59Z
**Language:** TypeScript  ·  **Repo size:** 37223KB



## Tech stack

**Name:** vite_react_shadcn_ts  ·  **Version:** 0.0.0  ·  **Type:** module

**Scripts:**
- `dev`: `vite`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `check:finalbill`: `node scripts/check-finalbill-locked.cjs`
- `verify:finalbill-lock`: `node scripts/verify-finalbill-lock.cjs`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `generate-types`: `ts-node scripts/generate-types.ts`
- `tally:sync`: `node scripts/sync-tally-export.js`
- `tally:direct-sync`: `node scripts/tally-direct-sync.js`

**Dependencies (68):** @ckeditor/ckeditor5-build-classic, @ckeditor/ckeditor5-react, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @hookform/resolvers, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-aspect-ratio, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-hover-card, @radix-ui/react-label, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toast...

**Dev Dependencies (22):** @eslint/js, @playwright/test, @supabase/mcp-server-supabase, @tailwindcss/typography, @types/node, @types/react, @types/react-dom, @vercel/node, @vitejs/plugin-react, @vitejs/plugin-react-swc, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, lovable-tagger, postcss, tailwindcss, typescript, typescript-eslint...

## Top-level files

- `.env.example` (2KB)
- `.gitignore` (284B)
- `.npmrc` (22B)
- `.nvmrc` (3B)
- `.vercelignore` (188B)
- `1_DROP_ALL_PHARMACY_OBJECTS.sql` (2KB)
- `2_CREATE_PHARMACY_TABLES.sql` (12KB)
- `AAKHRI_SOLUTION_HINDI.md` (6KB)
- `ADD_FORMULA_COLUMNS_FIX.sql` (2KB)
- `ADD_JSONB_COLUMNS_TO_LAB_TEST_CONFIG.sql` (2KB)
- `ADD_JSONB_RANGES_COLUMN.sql` (2KB)
- `ADD_VISIT_ID_TO_CREDIT_PAYMENTS.sql` (485B)
- `ADVANCE_PAYMENT_VOUCHER_FIX_GUIDE.md` (14KB)
- `APPLY_LEDGER_FIX.md` (6KB)
- `APPLY_MIGRATION_GUIDE.md` (4KB)
- `APPLY_PAYMENT_SAVE_FIX.md` (3KB)
- `AUDIT_REPORT.md` (40KB)
- `AUTOMATED_TEST_NESTED_SUBTESTS.sql` (8KB)
- `AYUSHMAN_QUICK_FIX.sql` (3KB)
- `BATCH_INVENTORY_IMPLEMENTATION_GUIDE.md` (12KB)
- `CASH_BOOK_DAILY_TRANSACTIONS_GUIDE.md` (5KB)
- `CGHS_SURGERY_FIELDS_IMPLEMENTATION.md` (3KB)
- `CHECK_ALL_CBC.sql` (317B)
- `CHECK_AND_ADD_COLUMNS.sql` (2KB)
- `CHECK_AND_FIX_RLS.sql` (2KB)
- `CHECK_AND_FIX_SEQUENCE.sql` (6KB)
- `CHECK_AND_INSERT_ALL_CBC_FORMULAS.sql` (3KB)
- `CHECK_NESTED_SUB_TESTS.sql` (471B)
- `CHECK_NESTED_UNITS.sql` (424B)
- `CHECK_PAYMENT_MODE.sql` (2KB)

## Folder breakdown

- `src/` — 754 files
- `supabase/` — 387 files
- `public/` — 51 files
- `claude-auto-confirm/` — 19 files
- `.claude/` — 17 files
- `scripts/` — 9 files
- `e2e/` — 7 files
- `api/` — 6 files
- `supabase-migrations/` — 2 files
- `.env.example/` — 1 file
- `.gitignore/` — 1 file
- `.npmrc/` — 1 file
- `.nvmrc/` — 1 file
- `.vercelignore/` — 1 file
- `1_DROP_ALL_PHARMACY_OBJECTS.sql/` — 1 file

## Recent commits

- `121c973` _2026-05-23_ — feat(visit): allow typing a new Diagnosis (creatable select) (#311)
- `ec54322` _2026-05-23_ — feat(ipd-dashboard): show Actions column for receptionist role (#310)
- `b86c197` _2026-05-23_ — fix(pwa): scope dark base background to installed app only (#309)
- `25343db` _2026-05-23_ — perf(discharge): eager-load IPD Discharge Summary to fix stale-chunk crash (#308
- `cb6d3d6` _2026-05-22_ — Merge pull request #306 from chatgptnotes/feat/pwa-installable-fullscreen
- `9e17bf1` _2026-05-22_ — fix(perf): don't fire sidebar count queries until authenticated
- `87f9fe6` _2026-05-22_ — Merge pull request #305 from chatgptnotes/feat/pwa-installable-fullscreen
- `bdb7c20` _2026-05-22_ — Merge remote-tracking branch 'origin/main' into feat/pwa-installable-fullscreen
- `92e547b` _2026-05-22_ — feat(tablet): living drug chart on Treatment Sheet
- `c1c318c` _2026-05-22_ — fix(tablet): make doctor-notes saves work — patient_id, real columns, medicine-b

## README

```markdown
# ESIC Patient Mapper

## Project info

A comprehensive hospital management system for patient registration, admission, and billing.

## How can I edit this code?

**Use your preferred IDE**

Clone this repo and push changes to the repository.

Requirements: Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone https://github.com/chatgptnotes/adamrit.com.git

# Step 2: Navigate to the project directory
cd adamrit.com

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Deploy using Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

# Resyncing repo

```

---

*Generated by `brain:repo-overview` — re-run anytime to refresh.*
