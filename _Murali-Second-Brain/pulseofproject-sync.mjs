// pulseofproject-sync.mjs — pull bugs / tasks (the "who does what" view) from
// pulseofproject.com into brain_chunks so the team and agents can query status.
// Usage: npm run brain:pulse   (node --env-file=.env.local ...)
//
// Modeled on fathom-sync.mjs. The ONLY part you adapt to the real
// pulseofproject.com API is the CONFIG block + fetchItems() + toItem() below.

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

// ── CONFIG — adapt these to the real pulseofproject.com API ──────────────────
const API_URL = process.env.PULSE_API_URL;   // e.g. https://pulseofproject.com/api
const API_KEY = process.env.PULSE_API_KEY;    // API key / bearer token
const SOURCE = 'pulseofproject';              // key in brain_sync_state

// Endpoint that lists bugs/tasks modified since a timestamp. Adjust path +
// query param to match the real API. Returns a JSON array (or .items/.data/.results).
function listUrl(since) {
  return `${API_URL}/issues?updated_since=${encodeURIComponent(since)}&limit=200`;
}

// Normalize one raw API record. ADAPT field names to the real payload.
function toItem(raw) {
  return {
    id:       raw.id ?? raw.issue_id ?? raw.key,
    title:    raw.title ?? raw.summary ?? raw.name ?? 'Untitled',
    project:  raw.project ?? raw.project_name ?? raw.client ?? 'Unknown',
    type:     raw.type ?? raw.issue_type ?? 'Bug',          // Bug | Task | Story
    status:   raw.status ?? raw.state ?? '',
    priority: raw.priority ?? raw.severity ?? '',
    assignee: raw.assignee ?? raw.assigned_to ?? raw.owner ?? 'Unassigned',
    updated:  raw.updated_at ?? raw.modified_at ?? raw.created_at ?? '',
    body:     raw.description ?? raw.body ?? raw.notes ?? '',
    url:      raw.url ?? raw.permalink ?? '',
  };
}
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

function requireEnv() {
  const missing = ['PULSE_API_URL', 'PULSE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env var(s): ${missing.join(', ')}`);
    console.error('Add them to .env.local (local) and GitHub repo secrets (CI), then re-run.');
    process.exit(1);
  }
}

async function getLastSync() {
  const { data } = await supabase
    .from('brain_sync_state').select('last_synced').eq('source', SOURCE).single();
  return data?.last_synced ?? '1970-01-01';
}

async function setLastSync(ts) {
  await supabase.from('brain_sync_state').upsert({ source: SOURCE, last_synced: ts }, { onConflict: 'source' });
}

async function fetchItems(since) {
  const res = await fetch(listUrl(since), { headers });
  if (!res.ok) throw new Error(`pulseofproject API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.items ?? data.data ?? data.results ?? []);
  const sinceDate = new Date(since);
  return list
    .map(toItem)
    .filter(i => i.id && new Date(i.updated || 0) > sinceDate);
}

async function run() {
  requireEnv();
  console.log('pulseofproject sync starting...');
  const since = await getLastSync();
  console.log(`Last sync: ${since}`);

  let items;
  try {
    items = await fetchItems(since);
  } catch (err) {
    console.error('Failed to fetch items:', err.message);
    process.exit(1);
  }

  console.log(`Found ${items.length} new/updated item(s).`);
  if (items.length === 0) return;

  const now = new Date().toISOString();
  let ingested = 0;

  for (const i of items) {
    const text = [
      `${i.type}: ${i.title}`,
      `Project: ${i.project}`,
      i.status ? `Status: ${i.status}` : null,
      i.priority ? `Priority: ${i.priority}` : null,
      `Assignee: ${i.assignee}`,
      i.url ? `Link: ${i.url}` : null,
      '',
      i.body,
    ].filter(v => v !== null && v !== undefined).join('\n');

    await ingestText({
      text,
      project_tag: i.project,
      source_type: SOURCE,
      source_ref: `pulseofproject://${i.type}/${i.id}`,
      metadata: {
        itemType: i.type, project: i.project, status: i.status,
        priority: i.priority, assignee: i.assignee,
      },
    });
    ingested++;
  }

  await setLastSync(now);
  console.log(`\npulseofproject sync complete. Ingested ${ingested} item(s).`);
}

run().catch(err => { console.error(err); process.exit(1); });
