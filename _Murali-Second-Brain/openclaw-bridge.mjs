// openclaw-bridge.mjs — call the OpenClaw API (running on VPS, reached via SSH tunnel).
// Use these from any brain script that needs to send WhatsApp.

const BASE = process.env.OPENCLAW_API_URL ?? 'http://127.0.0.1:18790';
const KEY = process.env.OPENCLAW_API_KEY;

async function post(path, body) {
  if (!KEY) throw new Error('OPENCLAW_API_KEY not set in .env.local');
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`OpenClaw ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function sendWhatsApp(target, message) {
  return post('/message/send', { target, message });
}

export async function addToAllowlist(phone) {
  return post('/allowlist/add', { phone });
}

// CLI smoke test:  node --env-file=.env.local _Murali-Second-Brain/openclaw-bridge.mjs send +91XXXXXXXXXX "hello"
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, phone, ...rest] = process.argv.slice(2);
  const message = rest.join(' ');
  try {
    if (cmd === 'send') {
      console.log(await sendWhatsApp(phone, message));
    } else if (cmd === 'allow') {
      console.log(await addToAllowlist(phone));
    } else {
      console.log('Usage: node openclaw-bridge.mjs send <phone> <message>');
      console.log('       node openclaw-bridge.mjs allow <phone>');
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
