// obsidian-sync.mjs — ingest new/changed Obsidian vault .md files into brain_chunks
// Usage:
//   Incremental (CI): the workflow computes changed files from the git push range and
//     passes them via CHANGED_FILES / DELETED_FILES (newline-separated, vault-relative paths).
//     Only those files are (re)ingested — runs in seconds, not a whole-vault re-embed.
//   Full re-sync (manual / local): with no CHANGED_FILES env, walk the vault. On a real
//     filesystem the mtime gate keeps it incremental; `workflow_dispatch` does a full re-embed.
//
// NOTE: do NOT rely on file mtime in CI — `actions/checkout` resets every file's mtime to the
// checkout time, which is why the old mtime-only filter re-embedded the entire vault every push.

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
  '_scratch', '.firecrawl', 'supabase', '_Email-Inbox'
]);

// Off-limits project tags — content ingested with off_limits=true
const OFF_LIMITS_TAGS = new Set(['hr', 'accounts', 'finance', 'salary', '_private', 'nabh-quality-hr']);

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

// A vault-relative path we never ingest (lives under a skipped folder or isn't markdown).
function isSkipped(relPath) {
  if (!relPath.endsWith('.md')) return true;
  return relPath.split('/').some((seg) => SKIP_FOLDERS.has(seg));
}

// Remove a file's existing chunks (idempotent re-ingest, and used on delete).
async function purgeFile(relPath) {
  await supabase.from('brain_chunks').delete().eq('source_ref', relPath);
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

// Ingest a single vault file by its vault-relative path.
// Returns 'ingested' | 'skipped'. Purges stale chunks first so re-ingest is idempotent,
// and also purges when the file no longer qualifies (deleted, retired/draft, too short).
async function ingestOne(relPath) {
  if (isSkipped(relPath)) return 'skipped';

  const fullPath = join(VAULT_ROOT, relPath);
  let raw, fileStat;
  try {
    fileStat = await stat(fullPath);
    raw = await readFile(fullPath, 'utf8');
  } catch (err) {
    // File listed as changed but gone (e.g. renamed away) — drop its chunks.
    if (err.code === 'ENOENT') { await purgeFile(relPath); return 'skipped'; }
    throw err;
  }

  const { data: fm, content } = matter(raw);

  // Skip retired / draft content — and purge any chunks it previously had.
  const status = (fm.status ?? '').toLowerCase();
  if (status === 'retired' || status === 'draft') { await purgeFile(relPath); return 'skipped'; }

  const project_tag = projectTagFromPath(relPath);
  const off_limits = OFF_LIMITS_TAGS.has(project_tag) || fm.off_limits === true;

  const text = [
    fm.title ? `# ${fm.title}` : '',
    content.trim()
  ].filter(Boolean).join('\n\n');

  if (text.length < 50) { await purgeFile(relPath); return 'skipped'; }

  // Delete previous chunks for this file so re-ingest is idempotent
  await purgeFile(relPath);

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
  return 'ingested';
}

function parseList(envVal) {
  return (envVal ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
}

async function run() {
  let ingested = 0;
  let skipped = 0;
  let purged = 0;

  // Incremental mode: the workflow set CHANGED_FILES (possibly empty) from the push diff.
  if (process.env.CHANGED_FILES !== undefined) {
    const changed = parseList(process.env.CHANGED_FILES);
    const deleted = parseList(process.env.DELETED_FILES);
    console.log(`Obsidian sync (incremental) — ${changed.length} changed, ${deleted.length} deleted`);

    for (const relPath of deleted) {
      if (isSkipped(relPath)) continue;
      await purgeFile(relPath);
      purged++;
    }
    for (const relPath of changed) {
      const result = await ingestOne(relPath);
      if (result === 'ingested') ingested++; else skipped++;
    }

    console.log(`\nObsidian sync complete. Ingested: ${ingested}, Purged: ${purged}, Skipped: ${skipped}`);
    return;
  }

  // Full / fallback mode (manual workflow_dispatch, or local run with real mtimes).
  const since = await getLastSync();
  console.log(`Obsidian sync (full) — files modified after ${since.toISOString()}`);
  const now = new Date().toISOString();

  for await (const fullPath of walkMd(VAULT_ROOT)) {
    const relPath = relative(VAULT_ROOT, fullPath);
    const fileStat = await stat(fullPath);

    // On a real filesystem mtime is meaningful; in CI it is reset by checkout so a
    // workflow_dispatch full run re-embeds everything (intended for an explicit re-sync).
    if (fileStat.mtime <= since) { skipped++; continue; }

    const result = await ingestOne(relPath);
    if (result === 'ingested') ingested++; else skipped++;
  }

  await setLastSync(now);
  console.log(`\nObsidian sync complete. Ingested: ${ingested} files, Skipped: ${skipped}`);
}

run().catch(err => { console.error(err); process.exit(1); });
