// =============================================================================
// sync-to-supabase.mjs
//
// Reads the changed.tsv emitted by the GitHub Action and:
//   - For added/modified .md files: uploads to the agent-corpus bucket at the
//     same relative path. The Storage webhook on the Supabase project triggers
//     the agent-ingest Edge Function which chunks + embeds.
//   - For renamed files (R*): uploads to the new path AND deletes the old path.
//   - For deleted files (D): deletes from the bucket.
//   - For files whose frontmatter `status: retired`: deletes from the bucket
//     regardless of git status, so retiring is a content-driven operation.
//
// Inputs:
//   changed.tsv      — produced by the workflow `git diff` step.
//                      Format per line: "<status>\t<old-path>[\t<new-path>]"
//                      where status is A | M | D | Rxxx | Cxxx.
//
// Env:
//   SUPABASE_URL                — full https URL
//   SUPABASE_SERVICE_ROLE_KEY  — service role key (never anon)
// =============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import matter from 'gray-matter';

const BUCKET = 'agent-corpus';
const TSV_PATH = 'changed.tsv';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const tsv = await fs.readFile(TSV_PATH, 'utf8').catch(() => '');
const lines = tsv.split('\n').map(l => l.trim()).filter(Boolean);

if (lines.length === 0) {
    console.log('No changed .md files in agents/ or corpus/. Nothing to do.');
    process.exit(0);
}

let uploaded = 0;
let deleted = 0;
let retired = 0;
let skipped = 0;
const errors = [];

for (const line of lines) {
    const [status, oldPath, newPath] = line.split('\t');
    try {
        if (status.startsWith('R') || status.startsWith('C')) {
            // Rename or copy: delete old key, upload new path.
            await deleteFromBucket(oldPath);
            await uploadFile(newPath);
        } else if (status === 'D') {
            await deleteFromBucket(oldPath);
        } else {
            // A (added) or M (modified)
            await uploadFile(oldPath);
        }
    } catch (err) {
        errors.push({ line, message: String(err.message ?? err) });
    }
}

console.log(JSON.stringify({ uploaded, deleted, retired, skipped, errors }, null, 2));

if (errors.length > 0) {
    console.error('Sync completed with errors.');
    process.exit(1);
}

// -----------------------------------------------------------------------------

async function uploadFile(relPath) {
    const localPath = path.resolve(relPath);
    let raw;
    try {
        raw = await fs.readFile(localPath, 'utf8');
    } catch {
        // File might have been removed between checkout and now — treat as delete.
        await deleteFromBucket(relPath);
        return;
    }

    // Read frontmatter to honour `status: retired` regardless of git op.
    const fm = matter(raw);
    const fmStatus = (fm.data?.status ?? '').toString().toLowerCase();

    if (fmStatus === 'retired') {
        await deleteFromBucket(relPath);
        retired += 1;
        console.log(`retired  ${relPath}`);
        return;
    }

    if (!fm.data?.department) {
        console.warn(`skip (no department in frontmatter): ${relPath}`);
        skipped += 1;
        return;
    }

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(relPath, raw, {
            contentType: 'text/markdown',
            upsert: true,
        });

    if (error) throw new Error(`upload ${relPath}: ${error.message}`);

    uploaded += 1;
    console.log(`upload   ${relPath} (dept=${fm.data.department}, status=${fmStatus || 'approved'})`);
}

async function deleteFromBucket(relPath) {
    const { error } = await supabase.storage.from(BUCKET).remove([relPath]);
    // 404 / not-found is fine — best-effort delete.
    if (error && !/not.?found/i.test(error.message)) {
        throw new Error(`delete ${relPath}: ${error.message}`);
    }
    deleted += 1;
    console.log(`delete   ${relPath}`);
}
