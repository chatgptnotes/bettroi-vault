---
domain: adamrit.com
repo: chatgptnotes/adamrit
default_branch: main
last_push: 2026-06-20T12:28:34Z
size_kb: 41406
language: TypeScript
description: ""
extracted: 2026-06-24T06:00:24.198Z
---
# Hospital Management System — `adamrit.com`

**Live URL:** https://adamrit.com/
**GitHub repo:** https://github.com/chatgptnotes/adamrit
**Default branch:** `main`  ·  **Last push:** 2026-06-20T12:28:34Z
**Language:** TypeScript  ·  **Repo size:** 41406KB



## Tech stack

**Name:** vite_react_shadcn_ts  ·  **Version:** 0.0.0  ·  **Type:** module

**Scripts:**
- `dev`: `vite`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `check:finalbill`: `node scripts/check-finalbill-locked.cjs`
- `verify:finalbill-lock`: `node scripts/verify-finalbill-lock.cjs`
- `check:automation-tables`: `node scripts/check-automation-table-access.cjs`
- `smoke:automations`: `node scripts/smoke-automations.cjs`
- `test:automations`: `npx vite-node e2e/run-task-flows.test.ts`
- `test:ward-bridge`: `npx vite-node e2e/ward-bridge.test.ts`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `generate-types`: `ts-node scripts/generate-types.ts`
- `tally:sync`: `node scripts/sync-tally-export.js`
- `tally:direct-sync`: `node scripts/tally-direct-sync.js`
- `check:emails`: `cd scripts/email-automation && node run.js`

**Dependencies (73):** @ckeditor/ckeditor5-build-classic, @ckeditor/ckeditor5-react, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @hookform/resolvers, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-aspect-ratio, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-hover-card, @radix-ui/react-label, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toast...

**Dev Dependencies (23):** @eslint/js, @playwright/test, @supabase/mcp-server-supabase, @tailwindcss/typography, @types/node, @types/react, @types/react-dom, @vercel/node, @vitejs/plugin-basic-ssl, @vitejs/plugin-react, @vitejs/plugin-react-swc, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, lovable-tagger, postcss, tailwindcss, typescript...

## Top-level files

- `.dockerignore` (445B)
- `.env.example` (3KB)
- `.gitignore` (395B)
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
- `Adamrit_HMS_Brochure.html` (62KB)
- `Adamrit_HMS_Brochure.pdf` (2.1MB)
- `BATCH_INVENTORY_IMPLEMENTATION_GUIDE.md` (12KB)
- `CASH_BOOK_DAILY_TRANSACTIONS_GUIDE.md` (5KB)
- `CGHS_SURGERY_FIELDS_IMPLEMENTATION.md` (3KB)
- `CHECK_ALL_CBC.sql` (317B)
- `CHECK_AND_ADD_COLUMNS.sql` (2KB)
- `CHECK_AND_FIX_RLS.sql` (2KB)
- `CHECK_AND_FIX_SEQUENCE.sql` (6KB)
- `CHECK_AND_INSERT_ALL_CBC_FORMULAS.sql` (3KB)

## Folder breakdown

- `src/` — 841 files
- `supabase/` — 450 files
- `public/` — 51 files
- `scripts/` — 32 files
- `agents/` — 25 files
- `claude-auto-confirm/` — 19 files
- `.claude/` — 17 files
- `api/` — 12 files
- `e2e/` — 12 files
- `docs/` — 9 files
- `sidecar/` — 9 files
- `docker/` — 6 files
- `rephrase-sidecar/` — 6 files
- `k8s/` — 4 files
- `supabase-migrations/` — 3 files

## Recent commits

- `be160b1` _2026-06-20_ — Lab report print: keep NORMAL RANGE hidden in preview/print
- `1731547` _2026-06-20_ — Lab: auto-fill/auto-save default values, fix report print, editable text default
- `bb2b551` _2026-06-19_ — Lab panels: add Numeric/Text Type + Text Value to nested sub-tests
- `7ff14d2` _2026-06-18_ — Cash Book top summary: split into Hope + Ayushman + Total
- `7eaa876` _2026-06-18_ — Show Cash Book Total + Closing Balance at top (mirror of footer)
- `5525410` _2026-06-18_ — Restrict lab panel Edit button to superadmin@ayushman.com only
- `3704051` _2026-06-17_ — Fix lab test reports visibility + remove 1000-row truncation
- `05fe380` _2026-06-17_ — fix(account-logs): sync month label with manual date input
- `3f8d20d` _2026-06-17_ — fix(cash-book): apply effectiveHospitalName to PHARMACY transaction type guard
- `3ee8f83` _2026-06-17_ — fix(cash-book): wire company filter and sort entries by date

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
