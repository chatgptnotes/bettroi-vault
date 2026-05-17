// email-sync.mjs — pulls recent emails via IMAP, AI-classifies importance,
// ingests significant ones into the brain marked off_limits (private to Murali).

import { ImapFlow } from 'imapflow';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { ingestText } from './ingest.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');
const LOOKBACK_HOURS = parseInt(process.argv.find(a => a.startsWith('--hours='))?.split('=')[1] ?? '24', 10);

const EMAIL_HOST = process.env.EMAIL_IMAP_HOST ?? 'imap.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_IMAP_PORT ?? '993', 10);

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('Missing EMAIL_USER or EMAIL_PASSWORD in .env.local');
  process.exit(1);
}

function safeSlug(s) {
  return (s || 'email').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function classifyEmail({ subject, from, snippet }) {
  const sys = `Score email importance for capture into Murali's knowledge base. Score 0-1:

1.0 = EXPLICIT DECISION / CONTRACT / signed PO / agreed price
0.9 = COMMITMENT from a client / vendor / partner (deadline, deliverable)
0.8 = QUOTE / proposal / pricing email (incoming or outgoing)
0.7 = MEETING outcome / important client thread / billing dispute
0.5 = General business correspondence
0.3 = Internal status updates
0.1 = Newsletter / promotional / receipt / auto-notification

Output ONLY JSON: {"score": <0-1>, "type": "<decision|commitment|quote|meeting|business|status|newsletter>", "summary": "<5-10 words>"}`;

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: sys,
      messages: [{ role: 'user', content: `From: ${from}\nSubject: ${subject}\n\n${(snippet || '').slice(0, 1500)}` }],
    });
    const m = res.content[0].text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { score: 0, type: 'parse-fail', summary: '' };
  } catch { return { score: 0, type: 'error', summary: '' }; }
}

async function inferProject(subject, body) {
  const KNOWN = ['Adamrit', 'Adamrit.com', 'NABH-quality-HR', 'BNI-Networking', 'Doctors digital office',
    'Bettroi-HopeTech-project-status', 'hopetech.me', 'fluxio.work Standupmeeting', 'pulseofproject.com',
    '2men.co', 'Linkist.ai', 'DDO.center', 'aiinmail.com', 'pratyaya.in', 'hrpulse.site',
    'modeaewintrack.com', 'drawtoboq.com', 'decodemybrain.com', 'nexaproc.in',
    'bajajenergy.nexaproc.in', 'PIMS.nexaproc.in', 'limitlessbrainlab.com', 'flowaccel.work',
    'Manufacturing Planning and JIT procurement agent'];
  const lc = (subject + ' ' + (body || '').slice(0, 500)).toLowerCase();
  for (const folder of KNOWN) {
    if (lc.includes(folder.toLowerCase().replace('.com','').replace('.in','').replace('-',' '))) return folder;
  }
  return '_Email-Inbox';
}

async function run() {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  console.log(`Email sync: ${process.env.EMAIL_USER} @ ${EMAIL_HOST} — last ${LOOKBACK_HOURS}h`);

  const client = new ImapFlow({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    logger: false,
  });
  await client.connect();
  await client.mailboxOpen('INBOX');

  // Fetch by date
  const list = client.fetch({ since }, { envelope: true, bodyStructure: true, uid: true, source: true });

  let processed = 0, ingested = 0, skipped = 0;
  for await (const msg of list) {
    processed++;
    const env = msg.envelope;
    const subject = env?.subject ?? '(no subject)';
    const from = (env?.from?.[0]?.address) ?? 'unknown';
    const fromName = env?.from?.[0]?.name ?? '';
    const date = env?.date?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    // Extract text from body
    let text = '';
    try {
      const src = msg.source?.toString('utf-8') || '';
      // crude extract: take first 3000 chars after empty line (body start)
      const idx = src.indexOf('\r\n\r\n');
      text = idx >= 0 ? src.slice(idx + 4, idx + 5000) : src.slice(0, 3000);
      // strip quoted-printable artifacts
      text = text.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    } catch {}

    const cls = await classifyEmail({ subject, from, snippet: text });
    if (cls.score < 0.6) { skipped++; continue; }

    const project = await inferProject(subject, text);
    const slug = `${date}-${safeSlug(subject)}`;

    if (DRY) {
      console.log(`[DRY] ${cls.score.toFixed(2)} ${cls.type.padEnd(10)} ${project.padEnd(30)} ${from.slice(0,30).padEnd(30)} ${subject.slice(0, 50)}`);
      ingested++;
      continue;
    }

    // Write .md to vault under _Email-Inbox/ (off_limits via folder name)
    const dir = join(VAULT_ROOT, '_Email-Inbox', date);
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, `${slug}.md`);
    const md = [
      '---',
      `date: ${date}`,
      `source: email`,
      `from: ${JSON.stringify(fromName ? `${fromName} <${from}>` : from)}`,
      `subject: ${JSON.stringify(subject)}`,
      `project: ${JSON.stringify(project)}`,
      `importance: ${cls.score.toFixed(2)}`,
      `email_type: ${cls.type}`,
      `summary: ${JSON.stringify(cls.summary)}`,
      `off_limits: true`,
      `imap_uid: ${msg.uid}`,
      '---',
      '',
      `# ${subject}`,
      '',
      `**From:** ${fromName || from}  ·  **Date:** ${date}`,
      cls.summary ? `\n> ${cls.summary}\n` : '',
      '',
      '```',
      text.slice(0, 5000),
      '```',
    ].join('\n');
    await writeFile(filepath, md);

    // Ingest into brain — off_limits=true means only Murali sees in queries
    const relPath = filepath.replace(VAULT_ROOT, '').replace(/^\//, '');
    await ingestText({
      text: `Email from ${fromName || from}: ${subject}\n\n${text.slice(0, 3000)}`,
      project_tag: project.toLowerCase().replace(/\s+/g, '-'),
      source_type: 'email',
      source_ref: relPath,
      metadata: { date, off_limits: true, importance: cls.score, type: cls.type, subject, from },
    });
    ingested++;
    console.log(`  ✓ [${cls.type}/${cls.score.toFixed(2)}] ${subject.slice(0, 60)} → ${project}`);
  }

  await client.logout();
  console.log(`\nProcessed ${processed} emails · Ingested ${ingested} · Skipped ${skipped}`);
}

run().catch(e => { console.error(e); process.exit(1); });
