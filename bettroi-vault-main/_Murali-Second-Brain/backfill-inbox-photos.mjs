// backfill-inbox-photos.mjs — process diary photos already sitting in #brain-inbox
// One-shot script. Run after the bot has been added to the channel but had missed events.
// Usage: node --env-file=.env.local _Murali-Second-Brain/backfill-inbox-photos.mjs [limit]

import { WebClient } from '@slack/web-api';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
import { ingestText } from './ingest.mjs';
import { callClaude } from './ai-client.mjs';

const VAULT_PATH = '/Users/murali/BeBrain/bettroi-vault';
const KNOWN_PROJECTS = [
  'Adamrit', 'Adamrit.com', 'Hope', 'NABH-quality-HR', 'BNI-Networking',
  'Doctors digital office', 'Pangong-preventive-healthcare', 'Foyertech',
  'Bettroi-HopeTech-project-status', 'hopetech.me', 'fluxio.work Standupmeeting',
  'pulseofproject.com', '2men.co', 'Linkist.ai', 'DDO.center', 'aiinmail.com',
  'pratyaya.in', 'hrpulse.site', 'modeaewintrack.com', 'drawtoboq.com',
  'decodemybrain.com', 'nexaproc.in', 'bajajenergy.nexaproc.in',
  'PIMS.nexaproc.in', 'adnoc.nexaproc.in', 'digitaltwin.nexaproc.in',
  'solaxis.com', 'amprix.in', 'app.headzhairfixing.com',
  'limitlessbrainlab.com', 'flowaccel.work',
  'Manufacturing Planning and JIT procurement agent',
];

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false }});

function safeSlug(s) { return (s || 'page').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40); }

async function ocrDiaryPage(base64, mimetype) {
  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimetype, data: base64 } },
        { type: 'text', text: `This is a photo of Murali's handwritten paper diary or notebook page. Extract ALL text faithfully — including dates, names, lists, tables, marginalia, scribbles.

Preserve structure:
- Headers and sub-headers
- Bullet lists / numbered lists
- Crossed-out items (mark as ~~text~~)
- Boxes / check marks → use [ ] and [x]
- Tables as markdown tables
- Dates exactly as written

If text is illegible, write [illegible]. Output ONLY the extracted markdown — no preamble.` }
      ]
    }]
  });
  return res.content[0].text;
}

async function classifyDiaryPage(ocrText) {
  const sys = `You classify Murali's handwritten paper diary pages.

Folders: ${KNOWN_PROJECTS.join(' | ')}

From the extracted text, determine:
- "folder": single best-match project folder, or "_inbox" if unclear
- "date": YYYY-MM-DD if a date is written on the page, else null
- "summary": one factual line (8-14 words) capturing what's on the page

Output ONLY JSON: {"folder": "<name>", "date": "YYYY-MM-DD" or null, "summary": "<line>"}`;
  const res = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: sys,
    messages: [{ role: 'user', content: ocrText.slice(0, 2000) }],
  });
  const m = res.content[0].text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { folder: '_inbox', date: null, summary: '' };
}

async function processPhoto(msg, file) {
  console.log(`\n→ Processing ${file.name || file.id} (${file.mimetype}) from ${new Date(parseFloat(msg.ts)*1000).toISOString()}`);

  // Skip if we've already ingested this file
  const slackPermalink = file.permalink ?? `slack://${msg.channel}/${msg.ts}`;
  const { data: existing } = await supabase.from('brain_chunks').select('id').eq('source_type', 'diary').like('source_ref', `%${file.id}%`).limit(1);
  if (existing?.length) { console.log('  ⊘ already ingested — skipping'); return 'skipped'; }

  // Download
  const imgRes = await fetch(file.url_private, { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }});
  if (!imgRes.ok) { console.log(`  ✗ download failed: ${imgRes.status}`); return 'failed'; }
  const base64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');

  // OCR
  console.log('  • OCR via Claude Sonnet...');
  const ocrText = await ocrDiaryPage(base64, file.mimetype);
  if (ocrText.length < 20) { console.log('  ✗ OCR too short — image may be unreadable'); return 'failed'; }
  console.log(`  • Got ${ocrText.length} chars`);

  // Tag from parent message [Prefix] or classify
  const text = msg.text ?? '';
  const prefixMatch = text.match(/^\[([^\]]+)\]/);
  let project_tag = prefixMatch ? prefixMatch[1] : null;
  let dateStr = null, summary = '';
  if (!project_tag) {
    const cls = await classifyDiaryPage(ocrText);
    project_tag = KNOWN_PROJECTS.includes(cls.folder) ? cls.folder : '_inbox';
    dateStr = cls.date;
    summary = cls.summary;
    console.log(`  • Classified → folder: ${project_tag} | date: ${dateStr} | summary: "${summary}"`);
  } else {
    console.log(`  • User-tagged → ${project_tag}`);
  }
  if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);

  // Write to vault
  const diaryDir = pathJoin(VAULT_PATH, project_tag, 'diary');
  await mkdir(diaryDir, { recursive: true });
  const fileName = `${dateStr} - diary-${safeSlug(summary || file.id.slice(-6))}.md`;
  const filePath = pathJoin(diaryDir, fileName);
  const md = [
    '---', `date: ${dateStr}`, `source: diary`, `slack_message: ${slackPermalink}`,
    summary ? `summary: ${JSON.stringify(summary)}` : null,
    `project: ${project_tag}`, `captured_at: ${new Date().toISOString()}`, '---', '',
    `# Diary — ${dateStr}`, summary ? `\n*${summary}*\n` : '', ocrText, '',
  ].filter(Boolean).join('\n');
  await writeFile(filePath, md);
  console.log(`  • Wrote ${project_tag}/diary/${fileName}`);

  // Ingest
  const relPath = filePath.replace(VAULT_PATH + '/', '');
  await ingestText({
    text: ocrText,
    project_tag: project_tag.toLowerCase().replace(/\s+/g, '-'),
    source_type: 'diary',
    source_ref: relPath + ` [${file.id}]`,
    metadata: { date: dateStr, summary, off_limits: false },
  });
  console.log('  ✓ Ingested into brain_chunks');
  return 'ingested';
}

const limit = parseInt(process.argv[2]) || 20;
const channel = process.env.SLACK_BRAIN_INBOX_CHANNEL_ID;
console.log(`Scanning last ${limit} messages in #brain-inbox (${channel})...`);
const h = await slack.conversations.history({ channel, limit });

const photos = h.messages.flatMap(m =>
  (m.files ?? [])
    .filter(f => f.mimetype?.startsWith('image/'))
    .map(f => ({ msg: { ...m, channel }, file: f }))
);
console.log(`Found ${photos.length} image attachment(s)`);

const results = { ingested: 0, skipped: 0, failed: 0 };
for (const { msg, file } of photos) {
  try { results[await processPhoto(msg, file)]++; }
  catch (e) { console.log(`  ✗ ${e.message}`); results.failed++; }
}
console.log(`\nDone: ingested=${results.ingested}, skipped=${results.skipped}, failed=${results.failed}`);
