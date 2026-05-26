# Adamrit Hospital Management System

> A comprehensive hospital ERP built on React + Vite + TypeScript, backed by Supabase (PostgreSQL), with deep integration to Tally ERP and communication services.

---

## System Map

```
                        ┌─────────────────┐
                        │  Patient Mgmt   │
                        └────────┬────────┘
              ┌──────────────────┼──────────────────┐
              │                  │                  │
        ┌─────▼────┐      ┌──────▼──────┐    ┌─────▼────┐
        │   IPD    │      │    OPD      │    │   Lab    │
        └─────┬────┘      └──────┬──────┘    └─────┬────┘
              │                  │                  │
        ┌─────▼────┐             │           ┌──────▼──────┐
        │ Pharmacy │             │           │  Radiology  │
        └─────┬────┘      ┌──────▼──────┐   └──────┬──────┘
              │           │   Billing   │           │
        ┌─────▼────┐      └──────┬──────┘           │
        │    OT    │             │                   │
        └──────────┘      ┌──────▼──────┐            │
                          │ Accounting  │◄───────────┘
                          └──────┬──────┘
                          ┌──────▼──────┐
                          │   Tally     │
                          │ Integration │
                          └──────┬──────┘
                          ┌──────▼──────┐
                          │  Tally ERP  │
                          └─────────────┘
```

---

## Modules

### Clinical
- [[Patient Management]] — Registration, demographics, visit history
- [[IPD]] — In-patient admissions, ward management
- [[OPD]] — Out-patient consultations
- [[Lab]] — Test orders, results, QC
- [[Radiology]] — Imaging procedures, DICOM reports
- [[Pharmacy]] — Medicine inventory, prescriptions, billing
- [[Operation Theatre]] — Surgery scheduling, procedure notes

### Financial
- [[Billing]] — Invoice creation, approvals, submission
- [[Accounting]] — Vouchers, cash book, ledgers, Tally gateway
- [[Tally Integration]] — Bidirectional sync with Tally ERP
- [[Insurance]] — Ayushman, CGHS, ESIC, HOPE schemes
- [[Corporate]] — Corporate packages, bulk billing

### Administrative
- [[Marketing]] — Campaigns, incentives, referral tracking
- [[Master Data]] — Doctors, surgeons, medicines, procedures
- [[Admin & Users]] — Staff roles, permissions, hospital config
- [[Reports & Analytics]] — Financial, clinical, operational reports

---

## External Services

- [[Supabase]] — Database, Auth, Realtime, Edge Functions
- [[Tally ERP]] — Accounting ERP (XML/HTTP integration)
- [[Twilio]] — Voice calls, WhatsApp messages
- [[OpenAI]] — AI clinical recommendations
- [[DoubleTick WhatsApp]] — WhatsApp notification channel

---

## Quick Reference

| Stack | Technology |
|-------|------------|
| Frontend | React 18.3 + Vite 5 + TypeScript 5.9 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase JWT |
| State | React Query + Zustand |
| UI | shadcn/ui + Tailwind CSS |
| Backend APIs | Vercel Serverless + Supabase Edge Functions |
| Accounting ERP | Tally Prime (XML API) |
| Communications | Twilio + DoubleTick WhatsApp |
| AI | OpenAI GPT |

---

*See [[System Overview]] for architecture diagram. See [[Data Flow]] for end-to-end workflows.*
