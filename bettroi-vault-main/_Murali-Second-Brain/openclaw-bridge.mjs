// openclaw-bridge.mjs — call the OpenClaw API (running on VPS, reached via SSH tunnel).
// Use these from any brain script that needs to send WhatsApp.

// Fast direct-send path via openclaw-bridge-server.js on VPS port 18799
const BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL ?? 'http://127.0.0.1:18799';
const BRIDGE_KEY = process.env.OPENCLAW_BRIDGE_KEY ?? 'bk-bridge-a8f3d1e9c2b7';

// AI-agent path via allowlist-api.py on VPS port 18790 (slow — uses LLM)
const API_URL = process.env.OPENCLAW_API_URL ?? 'http://127.0.0.1:18790';
const API_KEY = process.env.OPENCLAW_API_KEY;

async function postBridge(path, body) {
  const res = await fetch(BRIDGE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_KEY}` },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`OpenClaw bridge ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function postApi(path, body) {
  if (!API_KEY) throw new Error('OPENCLAW_API_KEY not set');
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`OpenClaw api ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Fast direct send — uses openclaw CLI directly, no LLM
export async function sendWhatsApp(to, message, channel = 'whatsapp') {
  return postBridge('/send', { to, message, channel });
}

// Add to allowlist (still uses the allowlist-api on 18790)
export async function addToAllowlist(phone) {
  return postApi('/allowlist/add', { phone });
}

export async function bridgeHealth() {
  const res = await fetch(BRIDGE_URL + '/health', {
    headers: { Authorization: `Bearer ${BRIDGE_KEY}` },
  });
  return res.json();
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
