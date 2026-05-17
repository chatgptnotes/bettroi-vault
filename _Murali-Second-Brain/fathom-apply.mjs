// fathom-apply.mjs
// Reads FATHOM-REVIEW.md (edited by Murali), writes a .md note for each
// meeting into the folder he chose. Skips entries with folder: SKIP.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const REVIEW_PATH = join(VAULT_ROOT, '_Murali-Second-Brain/FATHOM-REVIEW.md');
const DATA_PATH   = join(VAULT_ROOT, '_Murali-Second-Brain/fathom-backfill-data.json');

function safeSlug(s) {
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function ensureDir(path) {
  try { await mkdir(path, { recursive: true }); } catch {}
}

async function run() {
  const reviewText = await readFile(REVIEW_PATH, 'utf8');
  const meetings = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const meetingById = new Map(meetings.map(m => [String(m.id), m]));

  // Parse each ```...``` code block — each contains `id:`, `folder:`, `description:`
  const codeBlockRegex = /```\n([\s\S]*?)\n```/g;
  const decisions = [];
  for (const match of reviewText.matchAll(codeBlockRegex)) {
    const block = match[1];
    const id = block.match(/id:\s*(\d+)/)?.[1];
    const folder = block.match(/folder:\s*(.+)/)?.[1]?.trim();
    const description = block.match(/description:\s*(.+)/)?.[1]?.trim() ?? '';
    if (!id || !folder) continue;
    decisions.push({ id, folder, description });
  }

  console.log(`Parsed ${decisions.length} decisions from FATHOM-REVIEW.md`);

  let routed = {}, skipped = 0, errors = 0;
  for (const d of decisions) {
    const m = meetingById.get(d.id);
    if (!m) { console.warn(`  ⚠ no meeting data for id ${d.id}`); continue; }
    if (d.folder.toUpperCase() === 'SKIP') { skipped++; continue; }

    try {
      const dir = join(VAULT_ROOT, d.folder, 'meetings');
      await ensureDir(dir);
      const filepath = join(dir, `${m.date} - ${safeSlug(m.title)}.md`);

      const callIdMatch = (m.url || '').match(/\/calls\/(\d+)/);
      const callId = callIdMatch ? callIdMatch[1] : null;

      const fm = [
        '---',
        `date: ${m.date}`,
        `source: fathom`,
        `url: ${m.url}`,
        callId ? `call_id: ${callId}    # this is the number shown in Fathom's URL bar` : null,
        `recording_id: ${m.id}    # internal API id, not shown in Fathom UI`,
        m.attendees?.length ? `attendees: [${m.attendees.map(a => `"${a}"`).join(', ')}]` : null,
        `project: ${d.folder}`,
        d.description ? `description: ${JSON.stringify(d.description)}` : null,
        '---',
        '',
      ].filter(Boolean).join('\n');

      const descLine = d.description ? `> ${d.description}\n\n` : '';
      const body = `# ${m.title}\n\n*${m.date} — [Open in Fathom](${m.url})*\n\n${descLine}${m.summary || '_(no summary)_'}\n`;
      await writeFile(filepath, fm + body);
      routed[d.folder] = (routed[d.folder] || 0) + 1;
    } catch (e) {
      console.error(`  ✗ ${m.title}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nWrote: ${Object.values(routed).reduce((a,b)=>a+b,0)} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log('\nRouting:');
  Object.entries(routed).sort((a,b)=>b[1]-a[1]).forEach(([f,c]) => console.log(`  ${c.toString().padStart(3)}  ${f}`));
  console.log('\nNext: npm run brain:obsidian   (ingests the new notes into the brain)');
}

run().catch(err => { console.error(err); process.exit(1); });
