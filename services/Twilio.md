# Twilio

#service #communication #external

**Purpose:** Voice calls and WhatsApp messaging for doctor-to-doctor conference calls, patient notifications, and lab result delivery.

**Connected to:** [[Lab]], [[Patient Management]], [[IPD]], [[Billing]]

---

## API Routes

| Route | Purpose |
|-------|---------|
| `api/twilio-conference.ts` | Set up doctor-to-doctor conference call |
| `api/twilio-call.ts` | Initiate single outbound call |
| `api/twilio-twiml.ts` | Generate TwiML response (IVR script) |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `supabase/functions/send-admission-reminders/` | Scheduled WhatsApp reminders for patients |
| `supabase/functions/send-payment-alerts/` | Payment due WhatsApp alerts |

---

## Features Used

### WhatsApp Messages
- Lab report ready notifications → doctor/patient
- Payment due reminders → patient/billing staff
- Admission reminders → patient before appointment
- Report delivery (PDF link via WhatsApp)

### Voice Calls
- Conference call between doctors (`ConferenceCallPage.tsx`)
- Outbound patient calls
- IVR (Interactive Voice Response) via TwiML

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `patient_call_records` | History of calls made to patients |
| `whatsapp_notifications` | Audit log of all WhatsApp messages sent |

---

## Configuration

| Env Variable | Purpose |
|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio API authentication |
| `TWILIO_PHONE_NUMBER` | Hospital's Twilio phone number |

---

## See Also

- [[DoubleTick WhatsApp]] — alternative WhatsApp provider used as backup/primary channel
- [[Patient Management]] — patient contact details
