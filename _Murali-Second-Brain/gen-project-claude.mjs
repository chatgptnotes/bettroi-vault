// gen-project-claude.mjs — generate a per-project CLAUDE.md ("AI employee") for each active project.
// Pulls role/people/status from the brain (meetings, action items, Home.md) so opening Claude or the
// Claudian plugin inside a project folder gives a project-tailored assistant.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs            # all active projects
//   node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs --project adamrit
//   node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs --dry      # preview only
//
// Safety: never overwrites a human-authored CLAUDE.md — writes CLAUDE.generated.md beside it instead.

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');
const ONLY = (() => {
  const i = process.argv.indexOf('--project');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.argv.find(a => a.startsWith('--project='))?.split('=')[1] ?? null;
})();

// Tags that are not real delivery projects (system/meta folders + the archive subdir + strategy).
// Any tag starting with "_" is also skipped (vault system folders like _Daily-Briefs, _Marketing).
const SKIP_PROJECTS = new Set([
  '_inbox', 'vault-root', 'clippings', 'agents', 'corpus', 'glossary',
  'decisions', '_strategy', 'strategy', 'bettroi-vault-main',
  'modules', 'services', 'supabase', 'scripts',
]);

// Minimum chunks for a tag to be considered an active project (filters one-off noise tags).
const MIN_CHUNKS = 3;

// Explicit tag→folder overrides where normalized name matching isn't enough.
const FOLDER_OVERRIDES = {
  '2men': '2men.co',
  'adamrit-hms': 'Adamrit',
};

// Normalize a project/folder name for matching: lowercase, collapse spaces/underscores/hyphens to '-'.
// This lets the brain's kebab tags (e.g. "doctors-digital-office") match spaced folders
// (e.g. "Doctors digital office") while keeping distinguishing dots (adamrit vs adamrit.com).
const norm = (s) => s.toLowerCase().replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '');

// Standard vault block appended to every generated CLAUDE.md (source: webhook/CLAUDE.md).
const STANDARD_BLOCK = `
## Code Style
- Linter: ESLint
- Formatter: Prettier
- Type checking: tsc --noEmit

## Testing
- Test framework: vitest or jest
- Run tests: \`npm test\`

## Security
- No hardcoded secrets, use environment variables
- Validate all user inputs
- Parameterized queries for database access
`;

// Build a normalized-folder-name → actual-folder-name index of vault top-level dirs.
async function folderIndex() {
  const entries = await readdir(VAULT_ROOT, { withFileTypes: true });
  const idx = {};
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      idx[norm(e.name)] = e.name;
    }
  }
  return idx;
}

// Resolve a project_tag to an actual folder name, or null if no safe match exists.
function resolveFolder(tag, idx) {
  const override = FOLDER_OVERRIDES[tag.toLowerCase()];
  if (override) return idx[norm(override)] ?? override;
  return idx[norm(tag)] ?? null;
}

// Count chunks per project_tag (paginated — PostgREST caps a plain select at 1000 rows).
// Returns [{tag, count}] sorted desc, filtered to active projects.
async function activeProjects() {
  const counts = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('brain_chunks')
      .select('project_tag').eq('off_limits', false).range(from, from + PAGE - 1);
    if (error) throw new Error(`count query failed: ${error.message}`);
    if (!data.length) break;
    for (const r of data) counts[r.project_tag] = (counts[r.project_tag] || 0) + 1;
    if (data.length < PAGE) break;
  }
  return Object.entries(counts)
    .filter(([tag, n]) => !tag.startsWith('_') && !SKIP_PROJECTS.has(tag.toLowerCase()) && n >= MIN_CHUNKS)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// Gather the project context the brain already has.
async function gather(tag) {
  const { data: meetings } = await supabase.from('brain_chunks')
    .select('content, source_ref, metadata, created_at')
    .eq('project_tag', tag).eq('off_limits', false)
    .like('source_ref', '%/meetings/%')
    .order('created_at', { ascending: false }).limit(6);

  const { data: items } = await supabase.from('brain_action_items')
    .select('item_text, assignee, due_date, priority, status')
    .eq('project_tag', tag).eq('status', 'open')
    .order('due_date', { ascending: true, nullsFirst: false }).limit(20);

  return { meetings: meetings ?? [], items: items ?? [] };
}

async function readHome(folder) {
  for (const name of ['Home.md', 'README.md', 'index.md']) {
    try { return (await readFile(join(VAULT_ROOT, folder, name), 'utf8')).slice(0, 4000); }
    catch { /* try next */ }
  }
  return null;
}

async function generate(tag, folder, { meetings, items }, home) {
  const meetingBlock = meetings.length
    ? meetings.map(m => `*${(m.metadata?.date ?? m.created_at).slice(0, 10)}*\n${m.content.slice(0, 700)}`).join('\n---\n')
    : '(no meeting summaries in the brain yet)';
  const itemBlock = items.length
    ? items.map(i => `- ${i.assignee || '?'} (${i.priority || '?'}${i.due_date ? ', due ' + i.due_date : ''}): ${i.item_text}`).join('\n')
    : '(no open action items)';

  const sys = `You write a concise CLAUDE.md that turns Claude into the dedicated AI employee for a single project in Murali's portfolio (Murali = hospital owner + AI consulting CEO at Bettroi/HopeTech).

Output ONLY markdown (no preamble, no code fences). Use exactly these sections:

## Role
One sentence: "You are the AI employee for <project> — <what this project is>."

## Goal
The current objective(s) for this project, inferred from the context. 1-3 bullets.

## Key People
Real names + their role/relationship to the project, from the context. If none are clear, write "- (none identified yet)".

## Current Status
3-6 bullets of where things stand right now — latest decisions, what's in flight, blockers. Use real dates/specifics from the context.

## Conventions
2-4 bullets on how to work in this project (where notes live, naming, who to defer to). Keep generic if unknown.

Be factual and specific. Never invent people or facts not in the context. Total length under 350 words.`;

  const user = `PROJECT: ${tag}  (folder: ${folder})

=== Home/README note ===
${home ?? '(none)'}

=== Recent meetings (newest first) ===
${meetingBlock}

=== Open action items ===
${itemBlock}`;

  const res = await callClaude({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: sys, messages: [{ role: 'user', content: user }] });
  return res.content[0].text.trim();
}

async function fileExists(p) {
  try { await readFile(p, 'utf8'); return true; } catch { return false; }
}

async function run() {
  const idx = await folderIndex();
  let projects = await activeProjects();
  if (ONLY) projects = [{ tag: ONLY, count: 0 }];

  console.log(`${DRY ? '[DRY] ' : ''}Generating project CLAUDE.md for ${projects.length} project(s)...\n`);

  const seenFolders = new Set(); // dedupe tags that resolve to the same folder (keep highest count first)
  let written = 0, skipped = 0;
  for (const { tag, count } of projects) {
    const folder = resolveFolder(tag, idx);
    if (!folder) { console.log(`  ⊘ ${tag} (${count}) — no matching folder, skipping`); skipped++; continue; }
    if (seenFolders.has(folder)) { console.log(`  ↳ ${tag} (${count}) — already covered by ${folder}/, merged`); continue; }
    seenFolders.add(folder);

    const { meetings, items } = await gather(tag);
    const home = await readHome(folder);
    const body = await generate(tag, folder, { meetings, items }, home);

    const fm = `---\nproject: ${tag}\ntype: project-claude\ngenerated_at: ${new Date().toISOString()}\n---\n\n`;
    const content = fm + body + '\n' + STANDARD_BLOCK;

    const target = join(VAULT_ROOT, folder, 'CLAUDE.md');
    const exists = await fileExists(target);
    const outPath = exists ? join(VAULT_ROOT, folder, 'CLAUDE.generated.md') : target;

    if (DRY) {
      console.log(`\n──────── ${folder}/${exists ? 'CLAUDE.generated.md' : 'CLAUDE.md'} ────────`);
      console.log(body.slice(0, 600) + (body.length > 600 ? '\n…(truncated)…' : ''));
      written++;
      continue;
    }

    await writeFile(outPath, content);
    console.log(`  ✓ ${folder}/${exists ? 'CLAUDE.generated.md (existing CLAUDE.md preserved)' : 'CLAUDE.md'}`);
    written++;
  }

  console.log(`\n${DRY ? '[DRY] ' : ''}Done. ${written} generated, ${skipped} skipped (no folder).`);
}

run().catch(e => { console.error(e); process.exit(1); });

export { generate, gather, resolveFolder, folderIndex, readHome, STANDARD_BLOCK };
