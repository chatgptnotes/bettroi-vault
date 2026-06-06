// proposalos-sync.mjs — pull proposals, POs, and invoices from proposalos.in
// into brain_chunks (full-text, RAG-queryable, marked off_limits because financial).
// Usage: npm run brain:proposalos   (node --env-file=.env.local ...)
//
// Modeled on fathom-sync.mjs. The ONLY part you need to adapt to the real
// proposalos.in API is the CONFIG block + fetchDocuments() + toRecord() below.

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

// ── CONFIG — adapt these to the real proposalos.in API ───────────────────────
const API_URL = process.env.PROPOSALOS_API_URL;   // e.g. https://proposalos.in/api
const API_KEY = process.env.PROPOSALOS_API_KEY;    // API key / bearer token
const SOURCE = 'proposalos';                       // key in brain_sync_state

// The endpoint that lists documents modified since a timestamp. Adjust path +
// query param name to match the real API. Expected to return a JSON array
// (or an object whose .items/.data/.results is the array).
function listUrl(since) {
  return `${API_URL}/documents?updated_since=${encodeURIComponent(since)}&limit=200`;
}

// Normalize one raw API record into the fields we ingest. ADAPT field names.
function toRecord(raw) {
  return {
    id:       raw.id ?? raw.document_id,
    type:     raw.type ?? raw.doc_type ?? 'Document',   // Proposal | PO | Invoice
    client:   raw.client_name ?? raw.client ?? raw.customer ?? 'Unknown',
    number:   raw.number ?? raw.doc_number ?? raw.reference ?? '',
    date:     raw.date ?? raw.issued_at ?? raw.created_at ?? '',
    amount:   raw.amount ?? raw.total ?? raw.grand_total ?? '',
    status:   raw.status ?? '',
    updated:  raw.updated_at ?? raw.modified_at ?? raw.created_at ?? '',
    body:     raw.body ?? raw.content ?? raw.description ?? raw.notes ?? '',
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
  const missing = ['PROPOSALOS_API_URL', 'PROPOSALOS_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
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
  // upsert so the first run for a new source creates the row
  await supabase.from('brain_sync_state').upsert({ source: SOURCE, last_synced: ts }, { onConflict: 'source' });
}

async function fetchDocuments(since) {
  const res = await fetch(listUrl(since), { headers });
  if (!res.ok) throw new Error(`proposalos API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.items ?? data.data ?? data.results ?? []);
  const sinceDate = new Date(since);
  return list
    .map(toRecord)
    .filter(r => r.id && new Date(r.updated || 0) > sinceDate);
}

async function run() {
  requireEnv();
  console.log('proposalos sync starting...');
  const since = await getLastSync();
  console.log(`Last sync: ${since}`);

  let docs;
  try {
    docs = await fetchDocuments(since);
  } catch (err) {
    console.error('Failed to fetch documents:', err.message);
    process.exit(1);
  }

  console.log(`Found ${docs.length} new/updated document(s).`);
  if (docs.length === 0) return;

  const now = new Date().toISOString();
  let ingested = 0;

  for (const d of docs) {
    const text = [
      `Type: ${d.type}`,
      `Client: ${d.client}`,
      d.number ? `Number: ${d.number}` : null,
      d.date ? `Date: ${d.date}` : null,
      d.amount !== '' ? `Amount: ${d.amount}` : null,
      d.status ? `Status: ${d.status}` : null,
      d.url ? `Link: ${d.url}` : null,
      '',
      d.body,
    ].filter(v => v !== null && v !== undefined).join('\n');

    await ingestText({
      text,
      project_tag: d.client,
      source_type: SOURCE,
      source_ref: `proposalos://${d.type}/${d.id}`,
      // off_limits: true — proposals, POs and invoices are restricted (financial)
      metadata: {
        docType: d.type, client: d.client, number: d.number,
        date: d.date, amount: d.amount, status: d.status, off_limits: true,
      },
    });
    ingested++;
  }

  await setLastSync(now);
  console.log(`\nproposalos sync complete. Ingested ${ingested} document(s).`);
}

run().catch(err => { console.error(err); process.exit(1); });
