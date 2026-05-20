---
domain: nabh.online
repo: chatgptnotes/nabh_online_saas
default_branch: main
last_push: 2026-04-17T06:04:10Z
size_kb: 4100
language: TypeScript
description: ""
extracted: 2026-05-20T07:06:15.234Z
---
# NABH Quality + HR Platform — `nabh.online`

**Live URL:** https://nabh.online/
**GitHub repo:** https://github.com/chatgptnotes/nabh_online_saas
**Default branch:** `main`  ·  **Last push:** 2026-04-17T06:04:10Z
**Language:** TypeScript  ·  **Repo size:** 4100KB



## Tech stack

**Name:** nabh-evidence-creator  ·  **Version:** 1.1.0  ·  **Type:** module

**Scripts:**
- `dev`: `vite`
- `dev:vercel`: `vercel dev`
- `build`: `vite build`
- `build:check`: `tsc -b && vite build`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `test`: `vitest`
- `test:ui`: `vitest --ui`
- `test:run`: `vitest run`
- `test:coverage`: `vitest run --coverage`

**Dependencies (21):** @anthropic-ai/sdk, @emotion/react, @emotion/styled, @google/generative-ai, @mui/icons-material, @mui/material, @supabase/supabase-js, @types/bcryptjs, @types/jsonwebtoken, bcryptjs, html2canvas, html2pdf.js, jsonwebtoken, jspdf, lucide-react, pdf-lib, react, react-dom, react-router-dom, xlsx, zustand

**Dev Dependencies (20):** @eslint/js, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node, @types/react, @types/react-dom, @vercel/node, @vitejs/plugin-react, @vitest/ui, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, typescript, typescript-eslint, vercel, vite, vitest...

## Top-level files

- `.env.example` (705B)
- `.gitignore` (67B)
- `AGENTS.md` (8KB)
- `BACKEND_PROXY_TODO.md` (6KB)
- `CLAUDE.md` (3KB)
- `DECISIONS.md` (525B)
- `FIXES_SUMMARY.md` (8KB)
- `HEARTBEAT.md` (1KB)
- `IDENTITY.md` (421B)
- `MASTER_DATA_MIGRATION_PLAN.md` (17KB)
- `MERGE_RESOLUTION.md` (11KB)
- `NABH_COMPLETION_PLAN.md` (5KB)
- `README.md` (2KB)
- `SOUL.md` (1KB)
- `TOOLS.md` (858B)
- `USER.md` (588B)
- `aac_data_insert.sql` (14KB)
- `aac_data_simple.sql` (8KB)
- `eslint.config.js` (616B)
- `fix-discharged-status.mjs` (3KB)
- `index.html` (3KB)
- `package-lock.json` (348KB)
- `package.json` (2KB)
- `pnpm-lock.yaml` (221KB)
- `resolve-merge.sh` (1KB)
- `run-migration.cjs` (2KB)
- `sop.html` (18KB)
- `supabase_migration_add_evidence_fields.sql` (2KB)
- `test-db.html` (10KB)
- `test-evidence-save.html` (5KB)

## Folder breakdown

- `src/` — 128 files
- `supabase/` — 40 files
- `public/` — 14 files
- `skills/` — 10 files
- `.claude/` — 9 files
- `api/` — 8 files
- `docs/` — 4 files
- `tasks/` — 2 files
- `.clawhub/` — 1 file
- `.env.example/` — 1 file
- `.gitignore/` — 1 file
- `AGENTS.md/` — 1 file
- `BACKEND_PROXY_TODO.md/` — 1 file
- `CLAUDE.md/` — 1 file
- `DECISIONS.md/` — 1 file

## Recent commits

- `c75bc02` _2026-04-17_ — docs: add Karpathy coding guidelines to CLAUDE.md
- `8fb2ed4` _2026-03-30_ — Embed Hope Hospital logo as base64 for reliable display
- `e75cf19` _2026-03-30_ — Use external Hope Hospital logo URL for reliable display
- `adcffe7` _2026-03-30_ — Fix logo and header in generated documents
- `a018f67` _2026-03-30_ — Fix logo URL to use production domain for reliable display
- `3d2802a` _2026-03-30_ — Fix hospital logo in generated evidence documents
- `be0beef` _2026-03-30_ — Reapply "Fix hospital logo not showing in generated training documents"
- `98f2019` _2026-03-30_ — Revert "Fix broken logo in AI-generated evidence documents"
- `72b6dc3` _2026-03-30_ — Fix broken logo in AI-generated evidence documents
- `e3522ff` _2026-03-30_ — Revert "Fix hospital logo not showing in generated training documents"

## README

```markdown
# NABH Evidence Creator

A comprehensive evidence management system for NABH (National Accreditation Board for Hospitals) SHCO 3rd Edition accreditation preparation.

## Features

- **10 NABH Chapters**: AAC, COP, MOM, PRE, HIC, PSQ, ROM, FMS, HRM, IMS
- **Objective Elements Tracking**: View and manage all objective elements per chapter
- **Evidence Management**: Track evidence lists and uploaded files
- **Status Tracking**: Monitor progress with status (Not Started, In Progress, Blocked, Completed)
- **Priority Classification**: CORE, Previous NC, P0-P3 priorities
- **Assignee Management**: Track who is responsible for each element
- **Search and Filter**: Find specific objectives quickly
- **Progress Dashboard**: Visual overview of completion status

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Material UI (MUI)
- Zustand (State Management)
- Google Material Icons

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The application runs on `http://localhost:5173` by default.

## Project Structure

```
src/
├── components/
│   ├── Header.tsx        # App header with navigation
│   ├── Sidebar.tsx       # Chapter navigation sidebar
│   ├── Dashboard.tsx     # Overview dashboard
│   ├── ObjectiveList.tsx # Objective elements table
│   ├── ObjectiveDetail.tsx # Detail dialog
│   └── Footer.tsx        # Version footer
├── data/
│   └── nabhData.ts       # NABH chapters and objectives data
├── store/
│   └── nabhStore.ts      # Zustand state management
├── types/
│   └── nabh.ts           # TypeScript types
├── App.tsx               # Main application
└── main.tsx              # Entry point
```

## NABH Chapters

1. **AAC** - Access, Assessment and Continuity of Care
2. **COP** - Care of Patients
3. **MOM** - Management of Medication
4. **PRE** - Patient Rights and Education
5. **HIC** - Hospital Infection Control
6. **PSQ** - Patient Safety and Quality Improvement
7. **ROM** - Responsibilities of Management
8. **FMS** - Facility Management and Safety
9. **HRM** - Human Resource Management
10. **IMS** - Information Management System

## Environment Variables

No environment variables required for basic usage.

## License

Private - Internal use only.

---

v1.0 | 2026-01-26 | nabh-evidence-creator

```

---

*Generated by `brain:repo-overview` — re-run anytime to refresh.*
