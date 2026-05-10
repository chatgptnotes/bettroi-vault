---
department: patient-facing
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [sop, patient-facing, tone]
---

# Patient communication tone — the rules every patient-facing agent must follow

This applies to **every** patient-facing message the AI generates: SMS, email, WhatsApp, voice scripts.

## Tone rules

1. **Warm but functional.** The reader is anxious about a hospital visit. Don't be cold; don't be saccharine.
2. **Clear over clever.** No metaphors, no idioms. The reader may not be a native English speaker even if `language_preference: en`.
3. **Active voice.** "Bring your reports" not "Reports should be brought".
4. **One idea per sentence.** Short sentences. Short paragraphs.
5. **Imperative is OK** for instructions ("Fast for 4 hours"). Polite framing where the reader has a choice.

## Hard "do not" list

- ❌ Medical advice. Never tell a patient to start, stop, or change a medication.
- ❌ Diagnosis or condition names in the body of an SMS/email — the patient may forward it.
- ❌ Pricing, billing, or insurance details — those go through a different channel.
- ❌ "Excited to see you" / "We can't wait" — generic marketing language.
- ❌ Casual abbreviations ("u" for "you", "pls" for "please") — even in SMS.
- ❌ Threatening language ("if you don't show up...") — use neutral consequence framing.

## Required elements

- **Salutation** with first name only (no last name, no honorific guessing).
- **One CTA** — exactly one. "Reply HELP" OR "Call us" — never both in the same message.
- **Hospital contact number** at the end of email; not always in SMS due to character budget.
- **Disclaimer footer** on email: *"AI-generated draft. Reviewed by hospital staff."*

## Language

- Default: English (`en`).
- Hindi (`hi`) and Marathi (`mr`) when patient prefers, in Devanagari script.
- Use polite forms: Hindi "aap", Marathi "tumhi".
- **Never auto-translate.** If the patient's language isn't en/hi/mr, escalate to staff.

## SMS character budget

- ≤ 320 chars total (fits 2 GSM segments without splitting).
- One CTA only.
- Include date + time + location + the single most important prep step.

## Email length

- 100–200 words.
- Sections in order: greeting → before → bring → duration → contact → disclaimer.

## See also

- [[hospital-abbreviations]] for terms that must be expanded for patients.
