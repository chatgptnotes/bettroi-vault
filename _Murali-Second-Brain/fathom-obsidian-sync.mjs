// fathom-obsidian-sync.mjs
// Pulls Fathom meetings from the API, classifies each via Claude Haiku, and
// writes a .md note into the right project folder. Idempotent: a meeting whose
// note already exists on disk is skipped (no re-classify, no Haiku call).
// obsidian-sync.mjs ingests the new notes on its next run.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/fathom-obsidian-sync.mjs            # last 2 days (cron default)
//   node --env-file=.env.local _Murali-Second-Brain/fathom-obsidian-sync.mjs --since 2026-05-01   # backfill window
//   node --env-file=.env.local _Murali-Second-Brain/fathom-obsidian-sync.mjs --days 7   # last N days

import { callClaude } from './ai-client.mjs';
import { readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { join, basename } from 'node:path';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const FATHOM_API = 'https://api.fathom.ai/external/v1';
const headers = { 'X-Api-Key': process.env.FATHOM_API_KEY, 'Content-Type': 'application/json' };

const SKIP_FOLDERS = new Set([
  '_Murali-Second-Brain', '.git', 'node_modules', '.obsidian',
  '_scratch', '.firecrawl', 'supabase', 'scripts', 'Clippings',
  'glossary', 'agents', 'corpus', 'decisions', 'ops',
]);
const INBOX_FOLDER = '_Fathom-Inbox';

// --- argument parsing: --since YYYY-MM-DD | --days N (default 2) ---
function resolveSince() {
  const argv = process.argv.slice(2);
  const sinceIdx = argv.indexOf('--since');
  if (sinceIdx !== -1 && argv[sinceIdx + 1]) {
    return new Date(`${argv[sinceIdx + 1]}T00:00:00Z`).toISOString();
  }
  const daysIdx = argv.indexOf('--days');
  const days = daysIdx !== -1 && argv[daysIdx + 1] ? parseInt(argv[daysIdx + 1], 10) : 2;
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function fetchPage(url, retries = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res.json();
      if (res.status === 429 && attempt < retries) {
        const wait = Math.max(parseInt(res.headers.get('retry-after') || '0', 10) * 1000, 30000 * attempt);
        console.log(`  Fathom 429 rate-limited — waiting ${wait / 1000}s (attempt ${attempt})…`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if ((res.status === 502 || res.status === 503) && attempt < retries) {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      throw new Error(`Fathom API error: ${res.status} ${await res.text().catch(() => '')}`);
    } catch (e) {
      lastErr = e;
      if (attempt < retries && /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(e.message || '')) {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function fetchMeetings(since) {
  const all = [];
  let cursor = null, pages = 0;
  while (pages < 50) {
    const url = new URL(`${FATHOM_API}/meetings`);
    url.searchParams.set('created_after', since);
    url.searchParams.set('include_summary', 'true');
    if (cursor) url.searchParams.set('cursor', cursor);
    const data = await fetchPage(url.toString());
    all.push(...(data.items ?? []));
    pages++;
    if (!data.next_cursor) break;
    cursor = data.next_cursor;
    await new Promise(r => setTimeout(r, 3000)); // be gentle on the rate limiter between pages
  }
  return all;
}

function extractSummary(meeting) {
  const s = meeting.default_summary;
  if (!s) return null;
  return (typeof s === 'object' ? s.markdown_formatted : s) ?? null;
}

function extractAttendees(meeting) {
  const src = meeting.calendar_invitees ?? meeting.attendees ?? meeting.invitees ?? [];
  if (!Array.isArray(src)) return [];
  return src.map(a => (typeof a === 'string' ? a : a?.name ?? a?.email)).filter(Boolean);
}

function normalize(meeting) {
  const date = (meeting.created_at ?? meeting.started_at ?? meeting.scheduled_start_time ?? '').slice(0, 10);
  return {
    id: meeting.recording_id ?? meeting.id ?? '',
    date,
    title: (meeting.title ?? meeting.name ?? 'Untitled Meeting').trim(),
    url: meeting.share_url ?? meeting.url ?? '',
    attendees: extractAttendees(meeting),
    summary: extractSummary(meeting),
  };
}

function safeSlug(s) {
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function discoverProjectFolders() {
  const entries = await readdir(VAULT_ROOT, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP_FOLDERS.has(e.name))
    .map(e => e.name);
}

// Collect every existing meeting-note filename so we can skip already-written meetings.
async function existingNoteNames(projectFolders) {
  const names = new Set();
  for (const folder of [...projectFolders, INBOX_FOLDER]) {
    const dir = join(VAULT_ROOT, folder, 'meetings');
    try {
      for (const f of await readdir(dir)) names.add(f);
    } catch { /* no meetings dir yet */ }
  }
  return names;
}

async function classifyMeeting({ title, attendees, summary, projectFolders }) {
  const sys = `You classify business meeting notes into project folders.
Available folders: ${projectFolders.join(', ')}

Rules:
- Pick the SINGLE most relevant folder name from the list above (exact match).
- If none clearly fit, respond with folder="_Fathom-Inbox" and confidence=0.
- Output ONLY valid JSON: {"folder": "<name>", "confidence": <0..1>, "reason": "<short>"}`;
  const userMsg = `Title: ${title}
Attendees: ${attendees?.join(', ') || 'unknown'}

Summary excerpt:
${(summary || '').slice(0, 800)}`;
  const res = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: sys,
    messages: [{ role: 'user', content: userMsg }],
  });
  const text = res.content[0].text.trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { folder: INBOX_FOLDER, confidence: 0, reason: 'parse-fail' };
  try { return JSON.parse(m[0]); }
  catch { return { folder: INBOX_FOLDER, confidence: 0, reason: 'parse-fail' }; }
}

async function writeMeetingNote({ meeting, folder, classification }) {
  const targetDir = join(VAULT_ROOT, folder, 'meetings');
  await mkdir(targetDir, { recursive: true });
  const filename = `${meeting.date} - ${safeSlug(meeting.title)}.md`;
  const filepath = join(targetDir, filename);
  const frontmatter = [
    '---',
    `date: ${meeting.date}`,
    'source: fathom',
    `url: ${meeting.url}`,
    `recording_id: ${meeting.id}`,
    meeting.attendees?.length ? `attendees: [${meeting.attendees.map(a => `"${a}"`).join(', ')}]` : null,
    `project: ${folder}`,
    'classified_by: claude-haiku',
    `confidence: ${classification.confidence}`,
    classification.reason ? `classification_reason: "${classification.reason.replace(/"/g, '\\"')}"` : null,
    '---',
  ].filter(Boolean).join('\n');
  const body = `# ${meeting.title}\n\n*${meeting.date} — [Open in Fathom](${meeting.url})*\n\n${meeting.summary}\n`;
  await writeFile(filepath, `${frontmatter}\n\n${body}`);
  return filepath;
}

async function run() {
  const since = resolveSince();
  console.log(`Fathom → Obsidian sync — meetings since ${since}`);

  const meetings = (await fetchMeetings(since)).map(normalize);
  console.log(`Fetched ${meetings.length} meeting(s).`);

  const projectFolders = await discoverProjectFolders();
  const existing = await existingNoteNames(projectFolders);
  const allowed = new Set([...projectFolders, INBOX_FOLDER]);

  let written = 0, skipped = 0, noSummary = 0;
  const routed = {};

  for (const m of meetings) {
    if (!m.summary) { console.log(`  ⚠ no summary: ${m.title} — skipping`); noSummary++; continue; }
    const expected = `${m.date} - ${safeSlug(m.title)}.md`;
    if (existing.has(expected)) { skipped++; continue; }

    try {
      const cls = await classifyMeeting({ title: m.title, attendees: m.attendees, summary: m.summary, projectFolders });
      let folder = cls.folder;
      if (!allowed.has(folder) || cls.confidence < 0.6) folder = INBOX_FOLDER;
      const path = await writeMeetingNote({ meeting: m, folder, classification: cls });
      routed[folder] = (routed[folder] || 0) + 1;
      written++;
      console.log(`  → ${folder.padEnd(38)} (conf ${cls.confidence?.toFixed(2) ?? '0.00'})  ${basename(path)}`);
    } catch (err) {
      console.error(`  ✗ ${m.title}: ${err.message}`);
    }
  }

  console.log(`\nWrote ${written} new note(s); skipped ${skipped} existing; ${noSummary} without summary.`);
  if (written) {
    console.log('Routing:');
    Object.entries(routed).sort((a, b) => b[1] - a[1]).forEach(([f, c]) => console.log(`  ${String(c).padStart(3)}  ${f}`));
  }
}

run().catch(err => { console.error(err); process.exit(1); });
