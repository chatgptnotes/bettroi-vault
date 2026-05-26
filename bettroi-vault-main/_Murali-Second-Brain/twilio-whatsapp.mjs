// twilio-whatsapp.mjs — send WhatsApp via Twilio Sandbox
// Usage from CLI:
//   node --env-file=.env.local _Murali-Second-Brain/twilio-whatsapp.mjs send +91XXX "hello"
// Programmatic:
//   import { sendWhatsApp } from './twilio-whatsapp.mjs';
//   await sendWhatsApp('+919373111709', 'hello');

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Twilio Sandbox shared number. For production replace with your own WhatsApp Business sender.
const FROM = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

export async function sendWhatsApp(to, message) {
  if (!SID || !TOKEN) throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  const target = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const auth = 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const body = new URLSearchParams({ From: FROM, To: target, Body: message });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${data.message || JSON.stringify(data)} (code ${data.code})`);
  }
  return { ok: true, sid: data.sid, status: data.status, to: data.to };
}

// CLI:
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, to, ...rest] = process.argv.slice(2);
  if (cmd !== 'send' || !to || !rest.length) {
    console.log('Usage: node twilio-whatsapp.mjs send <+phone> <message...>');
    process.exit(0);
  }
  try {
    const r = await sendWhatsApp(to, rest.join(' '));
    console.log('✓', JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('✗', e.message);
    process.exit(1);
  }
}
