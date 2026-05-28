---
domain: hopetech.me
repo: chatgptnotes/openclaw-for-hostinger
default_branch: main
last_push: 2026-05-19T06:49:40Z
size_kb: 3488
language: TypeScript
description: ""
extracted: 2026-05-28T07:12:51.589Z
---
# OpenClaw Dashboard — `hopetech.me`

**Live URL:** https://hopetech.me/
**GitHub repo:** https://github.com/chatgptnotes/openclaw-for-hostinger
**Default branch:** `main`  ·  **Last push:** 2026-05-19T06:49:40Z
**Language:** TypeScript  ·  **Repo size:** 3488KB



## Tech stack

**Name:** nabh-evidence-creator  ·  **Version:** 1.1.0  ·  **Type:** module

**Scripts:**
- `dev`: `vite`
- `build`: `vite build`
- `build:check`: `tsc -b && vite build`
- `lint`: `eslint .`
- `preview`: `vite preview`

**Dependencies (12):** @anthropic-ai/sdk, @emotion/react, @emotion/styled, @google/generative-ai, @mui/icons-material, @mui/material, @supabase/supabase-js, lucide-react, react, react-dom, react-router-dom, zustand

**Dev Dependencies (14):** @eslint/js, @types/node, @types/react, @types/react-dom, @vercel/node, @vitejs/plugin-react, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript, typescript-eslint, vite, xlsx

## Top-level files

- `.gitignore` (376B)
- `AGENTS.md` (8KB)
- `BACKEND_PROXY_TODO.md` (6KB)
- `CLAUDE.md` (3KB)
- `DECISIONS.md` (525B)
- `HEARTBEAT.md` (2KB)
- `IDENTITY.md` (421B)
- `MASTER_DATA_MIGRATION_PLAN.md` (17KB)
- `MEMORY.md` (6KB)
- `MERGE_RESOLUTION.md` (11KB)
- `NABH_6_DAY_BATTLE_PLAN.md` (17KB)
- `NABH_ASSESSORS_REPORT.md` (6KB)
- `NABH_COMPLETION_PLAN.md` (5KB)
- `README.md` (2KB)
- `SOUL.md` (2KB)
- `TOOLS.md` (1KB)
- `USER.md` (588B)
- `VisionClawRN` (?)
- `aac_data_insert.sql` (14KB)
- `aac_data_simple.sql` (8KB)
- `dr-murali-bot-dashboard.html` (29KB)
- `dr-murali-complete-reference.md` (10KB)
- `eslint.config.js` (616B)
- `fix-discharged-status.mjs` (3KB)
- `google-workspace-cli.skill` (6KB)
- `hospital-voice-ivr.skill` (28KB)
- `index.html` (26KB)
- `nabh-evidence-templates.skill` (9KB)
- `nabh-live-quiz.html` (47KB)
- `nabh-mcq-test.html` (73KB)

## Folder breakdown

- `generated_sops_backup_20260206_211656/` — 420 files
- `generated_sops/` — 415 files
- `src/` — 76 files
- `public/` — 70 files
- `skills/` — 36 files
- `memory/` — 22 files
- `supabase/` — 22 files
- `.claude/` — 7 files
- `scripts/` — 7 files
- `transcripts/` — 6 files
- `docs/` — 3 files
- `tasks/` — 2 files
- `.gitignore/` — 1 file
- `.openclaw/` — 1 file
- `AGENTS.md/` — 1 file

## Recent commits

- `188656f` _2026-05-19_ — feat(seo): deploy 58 programmatic landing pages
- `2b53dfc` _2026-05-19_ — feat(seo): deploy 4 programmatic landing pages
- `45e51ff` _2026-04-17_ — docs: add Karpathy coding guidelines to CLAUDE.md
- `1f2a38f` _2026-02-20_ — Backup for Hostinger migration - 2026-02-20
- `18f25c2` _2026-02-07_ — Update dashboard: 6-day countdown, NABH audit protocol, daily reminders
- `f70dcd4` _2026-02-05_ — 📞 COMPLETE CONTACT UPDATE: All Numbers & WhatsApp Group JIDs
- `fed637e` _2026-02-05_ — 🚀 Merge: Comprehensive OpenBot Reference Dashboard
- `e78bbe6` _2026-02-05_ — 🤖 Complete OpenBot Reference Update: Dr. Murali BK Dashboard
- `51fe1e1` _2026-02-03_ — fix: update build script to skip TypeScript strict checking
- `0a13434` _2026-02-03_ — fix: resolve TypeScript build errors for Vercel deployment

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
