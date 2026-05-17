// obsidian-sync.mjs — ingest all Obsidian vault .md files into brain_chunks
// Usage: node --env-file=.env.local _Murali-Second-Brain/obsidian-sync.mjs

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import matter from 'gray-matter';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// Folders to skip entirely
const SKIP_FOLDERS = new Set([
  '_Murali-Second-Brain', '.git', 'node_modules', '.obsidian',
  '_scratch', '.firecrawl', 'supabase'
]);

// Off-limits project tags — content ingested with off_limits=true
const OFF_LIMITS_TAGS = new Set(['hr', 'accounts', 'finance', 'salary', '_private']);

async function getLastSync() {
  const { data } = await supabase
    .from('brain_sync_state')
    .select('last_synced')
    .eq('source', 'obsidian')
    .single();
  return new Date(data?.last_synced ?? '1970-01-01');
}

async function setLastSync(ts) {
  await supabase
    .from('brain_sync_state')
    .update({ last_synced: ts })
    .eq('source', 'obsidian');
}

function projectTagFromPath(relPath) {
  // First folder segment = project tag e.g. "Adamrit/Home.md" → "Adamrit"
  const parts = relPath.split('/');
  if (parts.length === 1) return 'vault-root';
  const folder = parts[0].toLowerCase().replace(/\s+/g, '-');
  return folder;
}

async function* walkMd(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_FOLDERS.has(entry.name)) yield* walkMd(full);
    } else if (entry.name.endsWith('.md')) {
      yield full;
    }
  }
}

async function run() {
  const since = await getLastSync();
  console.log(`Obsidian sync — files modified after ${since.toISOString()}`);

  let ingested = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for await (const fullPath of walkMd(VAULT_ROOT)) {
    const relPath = relative(VAULT_ROOT, fullPath);
    const fileStat = await stat(fullPath);

    // Only process files changed since last sync
    if (fileStat.mtime <= since) {
      skipped++;
      continue;
    }

    const raw = await readFile(fullPath, 'utf8');
    const { data: fm, content } = matter(raw);

    // Skip retired / draft content
    const status = (fm.status ?? '').toLowerCase();
    if (status === 'retired' || status === 'draft') {
      skipped++;
      continue;
    }

    const project_tag = projectTagFromPath(relPath);
    const off_limits = OFF_LIMITS_TAGS.has(project_tag) || fm.off_limits === true;

    const text = [
      fm.title ? `# ${fm.title}` : '',
      content.trim()
    ].filter(Boolean).join('\n\n');

    if (text.length < 50) { skipped++; continue; }

    await ingestText({
      text,
      project_tag,
      source_type: 'obsidian',
      source_ref: relPath,
      metadata: {
        date: fileStat.mtime.toISOString(),
        title: fm.title ?? relPath,
        off_limits,
      },
    });
    ingested++;
  }

  await setLastSync(now);
  console.log(`\nObsidian sync complete. Ingested: ${ingested} files, Skipped: ${skipped}`);
}

run().catch(err => { console.error(err); process.exit(1); });
