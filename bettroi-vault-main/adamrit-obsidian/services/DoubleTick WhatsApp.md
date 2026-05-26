# DoubleTick WhatsApp

#service #communication #external

**Purpose:** Alternative WhatsApp Business API provider for automated hospital notifications — lab reports, payment alerts, appointment reminders.

**Connected to:** [[Patient Management]], [[Billing]], [[Lab]]

---

## Configuration

| Env Variable | Purpose |
|-------------|---------|
| `DOUBLETICK_API_KEY` | DoubleTick API authentication key |
| `DOUBLETICK_PHONE` | Hospital's registered WhatsApp phone number |

---

## Features

- Automated patient notifications (lab ready, bill due, appointment)
- Hospital-to-patient WhatsApp messaging
- Template-based messages (WhatsApp Business templates)

---

## Relationship to Twilio

Both DoubleTick and [[Twilio]] are configured as WhatsApp providers. DoubleTick is purpose-built for WhatsApp Business, while Twilio also handles voice calls. The system can use either or both depending on message type.

---

## See Also

- [[Twilio]] — primary communication service (voice + WhatsApp)
- [[Patient Management]] — source of patient phone numbers
