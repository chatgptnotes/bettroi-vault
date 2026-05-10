---
department: clinical
sensitivity: public
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [glossary, clinical, icd10]
---

# ICD-10 shortlist

A working subset of [ICD-10](https://icd.who.int/browse10) codes commonly seen in Adamrit. Not exhaustive — the agent should accept any valid ICD-10 string and only use this list for human-readable expansion.

## Most common in OPD

| Code | Description |
|---|---|
| I10 | Hypertension (essential, primary) |
| E11 | Type 2 diabetes mellitus |
| E78.5 | Hyperlipidaemia, unspecified |
| J06.9 | Acute upper respiratory infection, unspecified |
| K30 | Functional dyspepsia |
| M54.5 | Low back pain |
| R10.4 | Other and unspecified abdominal pain |
| Z00.0 | General medical examination |

## Most common in IPD

| Code | Description |
|---|---|
| I21 | Acute myocardial infarction |
| I50 | Heart failure |
| J18 | Pneumonia, unspecified organism |
| K35 | Acute appendicitis |
| O80 | Single spontaneous delivery |
| S72 | Fracture of femur |
| N39.0 | Urinary tract infection, site not specified |

## Notes for the agents

- Always preserve the ICD-10 string verbatim from the source (`visits.diagnosis_id` → `diagnoses.icd10`).
- Don't substitute one code for a similar-sounding one (e.g. I10 ≠ I15.0).
- If a chart says "essential HTN" and there's no code, do not infer one.
