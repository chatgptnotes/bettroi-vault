// new-project.mjs — scaffold a new project the "video way": folder + Home.md + meetings/ + CLAUDE.md.
// The project_tag registers itself automatically when obsidian-sync next ingests a note from the folder
// (it tags chunks by folder name), so no DB write is needed here.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/new-project.mjs "Project Name"
//   node --env-file=.env.local _Murali-Second-Brain/new-project.mjs "Project Name" --tag custom-tag
//
// For a brand-new project there is nothing in the brain to synthesize, so a structured starter
// CLAUDE.md is written. Once meetings/notes accumulate, run:
//   node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs --project <tag>
// to regenerate it with real role/people/status from the brain.

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { STANDARD_BLOCK } from './gen-project-claude.mjs';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');

function parseArgs() {
  const args = process.argv.slice(2).filter(a => a !== '--dry');
  const tagIdx = args.indexOf('--tag');
  let tag = null;
  if (tagIdx !== -1) { tag = args[tagIdx + 1]; args.splice(tagIdx, 2); }
  const name = args.join(' ').trim();
  return { name, tag };
}

// project_tag obsidian-sync would assign = kebab-cased folder name. Mirror that so the
// generator's resolver finds this folder later.
const toTag = (folder) => folder.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9.\-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

function starterClaude(name, tag) {
  return `---
project: ${tag}
type: project-claude
generated_at: ${new Date().toISOString()}
seed: true
---

## Role
You are the AI employee for ${name} — _(describe what this project is in one line)_.

## Goal
- _(the current objective for this project)_

## Key People
- **Murali** — owner / decision-maker.

## Current Status
- New project — scaffolded ${new Date().toISOString().slice(0, 10)}. No history yet.

## Conventions
- Meeting notes live in \`${name}/meetings/\`.
- Defer scope and priority decisions to Murali.
- Re-generate this file from the brain once notes accumulate:
  \`node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs --project ${tag}\`
${STANDARD_BLOCK}`;
}

function starterHome(name) {
  return `---
type: project-home
status: active
created: ${new Date().toISOString().slice(0, 10)}
---

# ${name}

_One-line purpose: _

## Status
Active — created ${new Date().toISOString().slice(0, 10)}.

## Notes
- Drop meeting notes in \`meetings/\` (Fathom + obsidian-sync will ingest them into the brain).
`;
}

async function run() {
  const { name, tag: customTag } = parseArgs();
  if (!name) {
    console.error('Usage: node --env-file=.env.local _Murali-Second-Brain/new-project.mjs "Project Name" [--tag custom-tag]');
    process.exit(1);
  }
  const tag = customTag ?? toTag(name);
  const folderPath = join(VAULT_ROOT, name);

  // Guard: don't clobber an existing folder.
  const existing = await readdir(VAULT_ROOT, { withFileTypes: true });
  if (existing.some(e => e.isDirectory() && e.name === name)) {
    console.error(`✗ A folder named "${name}" already exists. Pick another name or work in it directly.`);
    process.exit(1);
  }

  console.log(`${DRY ? '[DRY] ' : ''}Scaffolding project "${name}" (tag: ${tag})`);
  console.log(`  ${name}/`);
  console.log(`  ${name}/meetings/`);
  console.log(`  ${name}/Home.md`);
  console.log(`  ${name}/CLAUDE.md`);

  if (DRY) { console.log('\n[DRY] No files written.'); return; }

  await mkdir(join(folderPath, 'meetings'), { recursive: true });
  await writeFile(join(folderPath, 'Home.md'), starterHome(name));
  await writeFile(join(folderPath, 'CLAUDE.md'), starterClaude(name, tag));

  console.log(`\n✓ Created ${name}/ with Home.md, CLAUDE.md, and meetings/.`);
  console.log(`Next: drop notes in ${name}/meetings/. The tag "${tag}" registers when obsidian-sync next runs.`);
  console.log(`Later: regenerate the CLAUDE.md from real data with:`);
  console.log(`  node --env-file=.env.local _Murali-Second-Brain/gen-project-claude.mjs --project ${tag}`);
}

run().catch(e => { console.error(e); process.exit(1); });
