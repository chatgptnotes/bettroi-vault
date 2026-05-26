---
department: clinical
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: approved
tags: [sop, adamrit, hospital-management, react, supabase]
---

# Adamrit — System Overview (Agent-Facing)

## What it is

Adamrit (a.k.a. ESIC Patient Mapper) is a web-based hospital management system used end-to-end for patient registration, OPD/IPD encounter management, lab and radiology orders, pharmacy dispensing, billing, discharge documentation, and ledger accounting. It is the operational system of record for hospital staff and the data source any clinical/operational agent grounded on this corpus should treat as canonical.

## Who uses it

- **Registration & front desk** — register patients, manage queues, run self-check-in kiosks.
- **OPD / IPD clinical staff** — record diagnoses, complications, treatment sheets, admission and shifting notes.
- **Lab and radiology** — book tests, enter results, deliver reports.
- **Pharmacy** — dispense medications, track batch inventory, run pharmacy bills.
- **Billing & accounts** — generate advance receipts, final bills, discharge invoices, post to cash book and ledger, export to Tally.
- **Corporate / B2B** — manage corporate accounts, bulk payments, B2B portal logins.
- **Administration** — user management, RBAC, activity logs, director-level dashboards.

## Schemes & payers handled

- **ESIC** — Employees' State Insurance Corporation
- **CGHS** — Central Government Health Scheme
- **PMJAY** / **MJPJAY** — Ayushman Bharat / Mahatma Jyotirao Phule Jan Arogya Yojana
- **Corporate** — direct company tie-ups
- **Private / self-pay**

Each scheme has its own tariff master; rates differ by scheme and surgery package. See [[adamrit-billing-workflow]] for how the right rate is selected.

## Deployment surface

- **Frontend:** static SPA on Vercel (React + Vite). Auto-deploys on push to `main` of `chatgptnotes/adamrit.com`.
- **Backend:** Supabase Postgres + Storage + Edge Functions. The `agent-corpus` Storage bucket is populated by the GitHub-action sync described in [[0001-obsidian-as-source-of-truth]].
- **Serverless functions:** Vercel Node functions under `api/` for telephony (Twilio), Tally export, and other server-only flows.

## Authoritative repos

- Application code: `chatgptnotes/adamrit.com`
- This vault (SOPs and agent grounding): `chatgptnotes/bettroi-vault`

## Glossary

Domain abbreviations used throughout this corpus are defined in [[hospital-abbreviations]]. ICD-10 codes used by `Diagnoses.tsx` and `useDiagnoses.ts` are listed in [[icd10-shortlist]].

## Related agent-corpus notes

- [[adamrit-clinical-workflows]] — OPD → IPD → discharge patient journey.
- [[adamrit-billing-workflow]] — advance payment → final bill → ledger.
- [[adamrit-pharmacy-workflow]] — pharmacy dispensing and inventory.
- [[adamrit-supabase-schema]] — key entities the app reads and writes.
- [[adamrit-deployment]] — Vercel + Supabase deployment specifics.
