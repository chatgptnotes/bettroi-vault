---
date: 2026-06-22
source: fathom
url: https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp
recording_id: 156886904
attendees: ["Dr Murali BK"]
project: pulseofproject.com
classified_by: claude-haiku
confidence: 0.7
classification_reason: "Meeting focuses on reviewing the new 'Pulse of Project' workflow system; includes Decode My Brain project scope details as an application example of the workflow."
---

# Impromptu Zoom Meeting

*2026-06-22 — [Open in Fathom](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp)*

## Meeting Purpose

[Align on project priorities and review the new "Pulse of Project" workflow.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=376.0)

## Key Takeaways

  - [**New Workflow:** A "Pulse of Project" page is now the single source of truth, requiring daily updates and uploaded meeting recordings (not Zoom links) to ensure full project context and transcript access.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2924.0)
  - [**Decode My Brain:** The project scope is now a full WordPress-to-Laravel migration, not a bug fix. The user flow is age-gated (register → pay → auto-assign assessment) and must be confirmed against the original client recording.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1246.0)
  - [**Dubai Media:** Tarun will implement a JotForm CC email workaround to fix the critical issue of users not receiving pre-filled form links, unblocking the entire project.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
  - [**Pratyaya:** This AI tool automates metro design compliance checks, reducing a month-long manual review to minutes. Its deterministic rules prevent AI from overriding critical safety violations.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3139.0)

## Topics

### New Project Management Workflow

  - [**Problem:** Inconsistent documentation and inaccessible meeting recordings hinder project context and team onboarding.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1448.0)
  - [**Solution:** The "Pulse of Project" page is the central hub for all project info.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2924.0)
      - [**Master Doc:** A Google Doc for daily updates (progress, plans, feedback).](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3082.0)
      - [**Deliverables Doc:** A PDF to freeze requirements before work begins.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=480.0)
      - [**Meeting Recordings:** Download audio/video and upload to Drive.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2956.0)
          - [**Why:** Direct Zoom links often disable downloads, preventing transcription and easy review.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1448.0)

### Decode My Brain (DMB) Project Alignment

  - [**Problem:** Scope creep and an incorrect user flow were identified.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1246.0)
  - [**Revised Scope:** A full migration from WordPress/WooCommerce to a standalone Laravel app.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1072.0)
      - [**Why:** The current WordPress component is slow and buggy.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=662.0)
      - [**Key Change:** No bug fixes on the old WordPress site.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1246.0)
  - [**User Flow:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1176.0)
    1.  [**Register:** User lands on `app.decodemybrain.com` and provides name, email, and DOB.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1109.0)
    2.  [**Pay:** User pays via Stripe Cashier (no free plan).](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1144.0)
    3.  [**Receive Credentials:** Email with login details sent from `info@limitlessbrainlab.com`.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1725.0)
    4.  **Auto-Assign Assessment:** The system automatically assigns an assessment based on the user's age:
          - [12–14 years → Quest](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1003.0)
          - [15–18 years → Evolve](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1024.0)
          - [18–50 years → Sumedh](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1024.0)
  - [**Corporate Flow:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1856.0)
      - [**Process:** Offline payment → Super admin creates a unique batch code with a seat limit.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1870.0)
      - [**Tracking:** The super admin dashboard shows usage (seats used/remaining) and assessment status for each organization.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2013.0)
  - [**Action:** The team must review the original client recording to confirm the exact user flow before proceeding.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1246.0)

### Dubai Media: Critical Bug Fix

  - [**Problem:** Users are not receiving pre-filled JotForm links in their emails, forcing them to log into JotForm directly. This has blocked the project for weeks.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
  - [**Solution:** Implement a workaround using JotForm's built-in CC feature.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
      - [**Mechanism:** A dedicated email address will be added to all JotForm workflows.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4321.0)
      - [**Outcome:** All pre-filled form links will be sent to this central inbox, allowing the application to retrieve and display them directly to the user.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4321.0)
      - [**Migration:** This fix applies to new workflows. The team will discuss migrating the 14,000 existing workflow links.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4443.0)

### Pratyaya: AI Compliance Demo

  - [**Problem:** Manual review of metro design drawings (AutoCAD, PDF) for compliance with standards (IEC, RDSO) is slow, taking a month or more per design.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3290.0)
  - [**Solution:** Pratyaya is an AI tool that automates this review.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3290.0)
      - [**Process:** User uploads drawing → AI parses features and validates against a ruleset → Generates a "redline" report.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3475.0)
      - [**Output:** A report with a compliance score and a breakdown of findings by severity (e.g., 3 critical, 11 major).](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=3566.0)
      - [**Key Feature:** The system uses deterministic rules for critical safety findings (e.g., missing smoke detectors) and will never override them, ensuring safety is prioritized.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4129.0)

### Project Priorities

1.  [**Dubai Media:** Fix the JotForm link issue.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
2.  [**Decode My Brain:** Confirm the user flow and begin testing.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4702.0)
3.  [**Brando Inventory:** Prepare for the Wednesday client meeting with an internal demo.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4729.0)

## Next Steps

  - [**Tarun:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
      - [Fix the Dubai Media JotForm email issue.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4304.0)
  - [**Anas & Kostob:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4562.0)
      - [Build the Agent Factory UI today, using Tarun's help to create 20 working agents.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4562.0)
  - [**Haritha:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1666.0)
      - [Get the downloadable audio file for the DMB client meeting recording.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1666.0)
  - [**DMB Team:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=4702.0)
      - [Review the client recording to confirm the user flow.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=1246.0)
      - [Begin testing the current DMB build.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2523.0)
  - [**All Team Leads:**](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2924.0)
      - [Adopt the "Pulse of Project" workflow immediately.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2924.0)
      - [Ensure meeting recordings are uploaded to Drive, not linked directly.](https://fathom.video/share/t1z3_Ud6uyBz3JCVv7MznexzPtAopzFp?tab=summary&timestamp=2956.0)

