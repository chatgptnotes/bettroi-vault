---
title: Developer Hospital-Issued Phone Numbers
project: Hope-Hospital
type: hr-asset-tracking
imported: 2026-05-18
off_limits: true
classification: hr-internal
---

# Developer Hospital-Issued Phone Numbers

> ⚠️ **HR / Asset Policy:** Each developer below has been issued a SIM by Hope Hospital for work use. **When the employee leaves or quits, the SIM MUST be returned to the hospital.** Track these as hospital assets.

## Roster (SIM-issued)

| # | Name | Hospital SIM | Status |
|---|---|---|---|
| 1 | Yash Deshmukh | 7028866447 | Active |
| 2 | Abhishek Kumar | 9823555053 | Active |
| 3 | Saikat Datt | 7028877661 | Active |
| 4 | Akshay Jaisinghani | 7028877220 | Active |
| 5 | Palak Dongare | 9665590424 | Active |
| 6 | Reha Kharwade | 8412030400 | Active |
| 7 | Ashray Salwe | 7028844883 | Active |
| 8 | Bhavik Sharma | 9422870986 | Active |
| 9 | Sonam Sharnagat | 8856945017 | Active |
| 10 | Ruchika Zade | 9665590424 | Active ⚠ |

> ⚠ **Possible duplicate:** Palak Dongare and Ruchika Zade both show as 9665590424 in the source document. One of these is likely a typo in `numberlist.docx`. Verify which is correct before issuing.

## SIM Return Protocol

When any developer above leaves the organization (resigns, terminated, end of contract):

1. **HR/Manager** notes the departure date.
2. **Before final settlement**, the SIM card listed above MUST be physically returned to the hospital admin office.
3. **Verify** the SIM number matches the issued number for that employee.
4. **Update this file** — change Status from `Active` to `Returned (YYYY-MM-DD)`.
5. **Notify telco** to either:
   - Re-assign the SIM to a new employee (preferred — keeps the number tied to the hospital asset pool)
   - OR deactivate the SIM if no replacement is needed.
6. **Block the number** in any internal access lists (BNI Supabase, WhatsApp Business, OpenClaw allowlist, etc.).

## Why this matters

These numbers are **hospital assets**, not personal phones. They may be:
- Tied to corporate WhatsApp Business sender accounts
- Used for OTP-based logins to Adamrit / DDO / hospital systems
- Linked to vendor portals (Pharma reps, suppliers, etc.)
- Receiving patient calls / inquiries

Letting a departed employee keep the SIM = security risk + ongoing telco cost + confusion when patients call expecting the hospital.

## Cross-references

- [[hospital-info]] — Hope Hospital group overview
- BNI 121 CRM `developers` table — has these same people without the phone numbers (the BNI table tracks BNI-related developer data, not their hospital phone assets)
- Source: `~/Downloads/numberlist.docx` imported 2026-05-18
