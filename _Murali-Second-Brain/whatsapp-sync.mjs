// whatsapp-sync.mjs — poll Twilio for WhatsApp messages Murali forwards to the
// sandbox number, and ingest them into the brain. Murali controls what enters by
// choosing what to forward — so no PHI is auto-captured and no always-on bridge /
// ToS-violating personal-WhatsApp reader is needed. Ingested as off_limits (private).
//
// One-time: from your phone, send "join root-seven" to the sandbox (+14155238886)
// if the session has lapsed (Twilio sandbox sessions expire after ~72h idle).
//
// Usage: node --env-file=.env.local _Murali-Second-Brain/whatsapp-sync.mjs [--dry]

import { ingestText } from './ingest.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SANDBOX = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
const OWNER = process.env.WHATSAPP_OWNER ?? 'whatsapp:+919373111709';
const WM_FILE = join(homedir(), '.brain-whatsapp-last');
const DRY = process.argv.includes('--dry');

if (!SID || !TOKEN) { console.error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN'); process.exit(1); }
const auth = 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64');

async function run() {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json?To=${encodeURIComponent(SANDBOX)}&PageSize=100`;
  const res = await fetch(url, { headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message || JSON.stringify(data)}`);

  // Only messages Murali sent TO the sandbox (his forwards). Skip the "join" handshakes.
  const inbound = (data.messages || [])
    .filter(m => m.direction === 'inbound' && m.from === OWNER && !/^join\s/i.test(m.body || ''))
    .sort((a, b) => new Date(a.date_sent) - new Date(b.date_sent));

  let last = null;
  try { last = (await readFile(WM_FILE, 'utf8')).trim() || null; } catch {}

  // First run: set the watermark to the newest existing message and stop, so we
  // don't ingest old history — only things forwarded from now on.
  if (!last) {
    const newest = inbound.length ? inbound[inbound.length - 1].date_sent : new Date(0).toISOString();
    if (!DRY) await writeFile(WM_FILE, newest);
    console.log(`WhatsApp sync: initialized watermark at ${newest}. Forward business messages to ${SANDBOX} to ingest them.`);
    return;
  }

  const lastDate = new Date(last);
  const fresh = inbound.filter(m => new Date(m.date_sent) > lastDate);
  console.log(`WhatsApp sync: ${fresh.length} new forwarded message(s)`);

  let ingested = 0, newWm = last;
  for (const m of fresh) {
    const body = (m.body || '').trim();
    newWm = m.date_sent;
    if (body.length < 3) continue;
    const pfx = body.match(/^\[([^\]]+)\]/);          // optional [ProjectTag] prefix
    const project_tag = pfx ? pfx[1] : '_inbox';
    const text = pfx ? body.slice(pfx[0].length).trim() : body;
    if (m.num_media && Number(m.num_media) > 0) {
      console.log(`  ⚠ message ${m.sid} has ${m.num_media} media attachment(s) — text ingested, media not yet supported`);
    }
    if (!DRY) {
      await ingestText({
        text: `WhatsApp message forwarded by Murali:\n\n${text}`,
        project_tag,
        source_type: 'whatsapp',
        source_ref: `whatsapp://${m.sid}`,
        metadata: { date: m.date_sent, from: m.from, off_limits: true },  // private to Murali
      });
    }
    ingested++;
    console.log(`  ✓ ingested: ${text.slice(0, 60)}`);
  }

  if (!DRY && newWm !== last) await writeFile(WM_FILE, newWm);
  console.log(`WhatsApp sync complete. Ingested ${ingested}.`);
}

run().catch(e => { console.error(e); process.exit(1); });
