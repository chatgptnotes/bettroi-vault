# OpenAI

#service #ai #external

**Purpose:** AI-powered clinical assistance — recommendations, field assistance, and automated letter generation/refinement.

**Connected to:** [[Lab]], [[Patient Management]], [[IPD]]

---

## Configuration

| Env Variable | Purpose |
|-------------|---------|
| `VITE_OPENAI_API_KEY` | OpenAI API key for frontend-facing calls |

---

## Integration Points

| File | Purpose |
|------|---------|
| `api/ai-field-assistant.js` | Vercel route — AI field helper for clinical forms |
| `supabase/functions/generate-letter/` | Auto-generate clinical/discharge letters |
| `supabase/functions/refine-letter/` | AI refinement of drafted letters |

---

## Features

### AI Clinical Recommendations
- Triggered when doctor fills in clinical forms
- Suggests diagnoses, treatments, or medication adjustments
- Results stored in `ai_clinical_recommendations` table for audit

### Field Assistant
- Inline AI help within IPD/OPD forms
- Helps fill clinical notes, assessment fields

### Letter Generation
- Auto-generates discharge summaries, referral letters
- Edge function refines drafts with GPT

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `ai_clinical_recommendations` | All AI suggestions shown to doctors (audit log) |

---

## See Also

- [[Lab]] — AI can suggest test interpretations
- [[Patient Management]] — patient history used as AI context
