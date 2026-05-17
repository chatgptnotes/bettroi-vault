// fathom-to-obsidian.mjs
// Classifies each Fathom meeting via Claude Haiku, then writes a .md note
// into the right project folder. obsidian-sync.mjs picks it up next run.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/fathom-to-obsidian.mjs <input.json>
//
// Input JSON: array of {id, date, title, url, attendees?, summary}

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const INPUT = process.argv[2] || join(VAULT_ROOT, '_Murali-Second-Brain/fathom-backfill-data.json');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SKIP_FOLDERS = new Set([
  '_Murali-Second-Brain', '.git', 'node_modules', '.obsidian',
  '_scratch', '.firecrawl', 'supabase', 'scripts', 'Clippings',
  'glossary', 'agents', 'corpus', 'decisions'
]);

const INBOX_FOLDER = '_Fathom-Inbox';

async function discoverProjectFolders() {
  const entries = await readdir(VAULT_ROOT, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP_FOLDERS.has(e.name))
    .map(e => e.name);
}

function safeSlug(s) {
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function classifyMeeting({ title, attendees, summary, projectFolders }) {
  const sys = `You classify business meeting notes into project folders.
Available folders: ${projectFolders.join(', ')}

Rules:
- Pick the SINGLE most relevant folder name from the list above (exact match).
- If none clearly fit, respond with folder="_Fathom-Inbox" and confidence=0.
- Output ONLY valid JSON: {"folder": "<name>", "confidence": <0..1>, "reason": "<short>"}`;

  const userMsg = `Title: ${title}
Date: -
Attendees: ${attendees?.join(', ') || 'unknown'}

Summary excerpt:
${summary.slice(0, 800)}`;

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: sys,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = res.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { folder: INBOX_FOLDER, confidence: 0, reason: 'parse-fail' };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch {
    return { folder: INBOX_FOLDER, confidence: 0, reason: 'parse-fail' };
  }
}

async function ensureDir(path) {
  try { await mkdir(path, { recursive: true }); } catch {}
}

async function writeMeetingNote({ meeting, folder, classification }) {
  const targetDir = join(VAULT_ROOT, folder, 'meetings');
  await ensureDir(targetDir);

  const slug = safeSlug(meeting.title);
  const filename = `${meeting.date} - ${slug}.md`;
  const filepath = join(targetDir, filename);

  const frontmatter = [
    '---',
    `date: ${meeting.date}`,
    `source: fathom`,
    `url: ${meeting.url}`,
    `recording_id: ${meeting.id}`,
    meeting.attendees?.length ? `attendees: [${meeting.attendees.map(a => `"${a}"`).join(', ')}]` : null,
    `project: ${folder}`,
    `classified_by: claude-haiku`,
    `confidence: ${classification.confidence}`,
    classification.reason ? `classification_reason: "${classification.reason.replace(/"/g, '\\"')}"` : null,
    '---',
    '',
  ].filter(Boolean).join('\n');

  const body = `# ${meeting.title}\n\n*${meeting.date} — [Open in Fathom](${meeting.url})*\n\n${meeting.summary}\n`;

  await writeFile(filepath, frontmatter + body);
  return filepath;
}

async function run() {
  const raw = await readFile(INPUT, 'utf8');
  const meetings = JSON.parse(raw);
  console.log(`Loaded ${meetings.length} meetings from ${basename(INPUT)}`);

  const projectFolders = await discoverProjectFolders();
  console.log(`Project folders: ${projectFolders.join(', ')}`);
  console.log('');

  const allowed = new Set([...projectFolders, INBOX_FOLDER]);
  let routed = {};
  let totalWritten = 0;

  for (const m of meetings) {
    try {
      const cls = await classifyMeeting({
        title: m.title,
        attendees: m.attendees,
        summary: m.summary || '',
        projectFolders,
      });

      let folder = cls.folder;
      if (!allowed.has(folder) || cls.confidence < 0.6) {
        folder = INBOX_FOLDER;
      }

      const path = await writeMeetingNote({ meeting: m, folder, classification: cls });
      routed[folder] = (routed[folder] || 0) + 1;
      totalWritten++;
      console.log(`  → ${folder.padEnd(40)} (conf ${cls.confidence?.toFixed(2) ?? '0.00'})  ${basename(path)}`);
    } catch (err) {
      console.error(`  ✗ ${m.title}: ${err.message}`);
    }
  }

  console.log('');
  console.log(`Wrote ${totalWritten}/${meetings.length} notes.`);
  console.log('Routing summary:');
  Object.entries(routed).sort((a,b) => b[1]-a[1]).forEach(([f, c]) => console.log(`  ${c.toString().padStart(3)}  ${f}`));
  console.log('');
  console.log('Next: run `npm run brain:obsidian` to ingest into brain.');
}

run().catch(err => { console.error(err); process.exit(1); });
