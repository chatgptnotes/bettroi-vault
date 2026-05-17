// fathom-review.mjs
// Generates a single REVIEW.md file with all Fathom meetings + classifier
// suggestions. You edit the `folder:` line per meeting, then run fathom-apply.

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const INPUT = process.argv[2] || join(VAULT_ROOT, '_Murali-Second-Brain/fathom-backfill-data.json');
const REVIEW_PATH = join(VAULT_ROOT, '_Murali-Second-Brain/FATHOM-REVIEW.md');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SKIP_FOLDERS = new Set([
  '_Murali-Second-Brain', '.git', 'node_modules', '.obsidian',
  '_scratch', '.firecrawl', 'supabase', 'scripts', 'Clippings',
]);

async function discoverProjectFolders() {
  const entries = await readdir(VAULT_ROOT, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP_FOLDERS.has(e.name))
    .map(e => e.name);
}

async function classify({ title, attendees, summary, projectFolders }) {
  const sys = `Classify a business meeting AND write a short factual description.

Available project folders: ${projectFolders.join(' | ')}

Rules:
- Pick the SINGLE most relevant folder name (exact match from the list above).
- If none fit clearly, output "_Fathom-Inbox" with confidence below 0.6.
- "description" = 8 to 14 words, capturing what was actually decided or discussed. Be specific (names, decisions, amounts). NOT marketing fluff. NOT a question.

Output ONLY this JSON (no commentary): {"folder": "<name>", "confidence": 0..1, "description": "<8-14 words>", "reason": "<why this folder>"}`;
  const user = `Title: ${title}
Attendees: ${attendees?.join(', ') || 'unknown'}
Summary:
${(summary || '').slice(0, 800)}`;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: sys,
      messages: [{ role: 'user', content: user }],
    });
    const text = res.content[0].text.trim();
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { folder: '_Fathom-Inbox', confidence: 0, description: '', reason: 'parse-fail' };
  } catch (e) {
    return { folder: '_Fathom-Inbox', confidence: 0, description: '', reason: e.message };
  }
}

async function run() {
  const meetings = JSON.parse(await readFile(INPUT, 'utf8'));
  const folders = await discoverProjectFolders();
  console.log(`Classifying ${meetings.length} meetings (Haiku — fast)...`);

  const blocks = [];
  for (let i = 0; i < meetings.length; i++) {
    const m = meetings[i];
    const cls = await classify({ title: m.title, attendees: m.attendees, summary: m.summary, projectFolders: folders });
    const suggested = cls.folder;
    const conf = (cls.confidence ?? 0).toFixed(2);
    const reason = cls.reason ?? '';

    const summary = (m.summary || '').replace(/\n+/g, ' ').slice(0, 280);
    const attendees = (m.attendees || []).join(', ') || '_(none listed)_';

    const callIdMatch = (m.url || '').match(/\/calls\/(\d+)/);
    const callId = callIdMatch ? callIdMatch[1] : '?';

    blocks.push(
`## [${i+1}/${meetings.length}] ${m.date} — ${m.title}
\`\`\`
id: ${m.id}
folder: ${suggested}
\`\`\`
- url: ${m.url}
- call_id (visible in Fathom URL bar): \`${callId}\`
- attendees: ${attendees}
- suggested: **${suggested}** (confidence ${conf}) — _${reason}_
- summary: ${summary}...
`);
    process.stdout.write('.');
  }

  const folderList = folders.map(f => `- \`${f}\``).join('\n');

  const header = `# Fathom Backfill Review

**Instructions:**
1. For each meeting, edit the \`folder:\` line inside its \`\`\`...\`\`\` code block.
2. Set it to one of the **existing folders** below, OR type a NEW folder name (it'll be created).
3. Set \`folder: SKIP\` to discard the meeting (e.g. for low-value impromptu calls).
4. Save this file when done.
5. Run: \`npm run brain:fathom-apply\` — that writes the .md notes into the chosen folders.
6. Then: \`npm run brain:obsidian\` — that ingests the notes into the brain.

**Existing project folders:**
${folderList}

**Common new folders you might want:** \`HEADS\`, \`NeuroQ\`, \`Linkist\`, \`BNI-Networking\`, \`Bajaj-Energy\`, \`Pune-Metro\`, \`Maha-Metro\`, \`Draw2BOQ\`, \`Decode-My-Brain\`, \`NexaProc\`

---

`;

  await writeFile(REVIEW_PATH, header + blocks.join('\n---\n\n'));
  console.log(`\n\nReview file written: ${REVIEW_PATH}`);
  console.log('Open it in Obsidian, edit folder: lines, then run: npm run brain:fathom-apply');
}

run().catch(err => { console.error(err); process.exit(1); });
