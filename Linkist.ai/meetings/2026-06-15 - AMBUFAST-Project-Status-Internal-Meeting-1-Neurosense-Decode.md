---
date: 2026-06-15
source: fathom
url: https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6
recording_id: 154942908
attendees: ["Admin Bettroi", "Dr. Murali B K", "Dr Murali BK"]
project: Linkist.ai
classified_by: claude-haiku
confidence: 0.75
classification_reason: "Linkist NFC explicitly mentioned in title; internal AMBUFAST project status covering multiple products (Neurosense, Decode, Neuro360Q, Linkist), but Linkist is primary in focus"
---

# AMBUFAST-Project Status Internal Meeting-1 Neurosense, Decode, Neuro360Q & Linkist NFC

*2026-06-15 — [Open in Fathom](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6)*

## Meeting Purpose

[Internal sync to resolve critical bugs and clarify client requirements before handoff.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1740.0)

## Key Takeaways

  - [**Patient Sync Bug Resolved:** The critical bug blocking patient report generation was a user error. The client was adding patients to the old `neurosense360.site` staging server, not the new `limitlessbrain.com` production environment.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=877.0)
  - [**Client Clarifications Needed:** Development is blocked on key features (coach booking, custom programs) pending client input on content (video URLs) and workflow (manual coach assignment).](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1190.0)
  - [**UAT Bug Status:** Many UI/UX bugs are fixed (e.g., pricing, banners), but email delivery to spam folders requires a live test with the client to confirm if the issue persists.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1960.0)
  - [**Handoff Meeting Prep:** An internal sync is required before the handoff meeting tomorrow to ensure the team is aligned on all fixes and open questions.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1740.0)

## Topics

### Critical Patient Sync Bug

  - [**Problem:** Patients added in the clinic admin were not appearing in the super admin, blocking report generation.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=274.0)
  - [**Diagnosis:** The client was using the old `neurosense360.site` staging server, not the new `limitlessbrain.com` production environment.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=877.0)
  - [**Resolution:** The issue is a user error, not a bug. The client will be instructed to use the correct URL.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=981.0)
  - [**Data Migration:** A full data migration (including reports) is on hold as it is not urgent for the client.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1058.0)

### UAT Bug Review & Status

  - [**Fixed:**](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1860.0)
      - [Pricing updated to $29.99.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1897.0)
      - [Banners, posters, and footer text removed.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1860.0)
      - ["Explore now" button changed to "Pay and take away."](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1897.0)
      - [Coach roles updated (e.g., Akshita → "diet concrete").](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=2108.0)
      - ["Submit Feedback" form and demo report requests now function correctly.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=2250.0)
      - ["Events" tab hidden from the dashboard.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=2343.0)
  - [**Pending Client Clarification:**](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1190.0)
      - [**Coach Booking Workflow:** Confirm manual assignment by the super admin post-payment.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1210.0)
      - [**Custom Care Programs:** Provide direct video URLs for each report combination (e.g., LLL to HHH).](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1288.0)
      - [**Nootropics Section:** Provide the required banner image.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1416.0)
      - [**Brain Academy:** Define content requirements for this section.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1440.0)
      - [**Email Footer:** Specify content for the clinic's QEEG report email.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=2460.0)
      - [**Frequency Videos:** Confirm the correct numeric value (417 or 147).](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1641.0)
      - [**Landing Page UI:** Clarify the "A drop above any" note.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1915.0)
  - [**Requires Live Test:**](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1960.0)
      - [**Spam Emails:** Verify if emails still go to spam during the handoff meeting.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1960.0)

## Next Steps

  - [**Haritha:** Schedule an internal sync with Dr. Murali before the client handoff meeting.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1680.0)
  - [**Haritha:** Schedule a client meeting with Dr. Shweta to review the clarification document.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1492.0)
  - [**Sahil:** Instruct the client to use the correct `limitlessbrain.com` URL for all patient entries.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1081.0)
  - [**Sahil:** Prepare for a live test of the email spam issue during the handoff meeting.](https://fathom.video/share/6fVXP1mJs-39mqtf9wSNZmUyotE5fjc6?tab=summary&timestamp=1960.0)

