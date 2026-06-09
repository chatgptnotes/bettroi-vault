// fathom-sync.mjs — pull all Fathom meeting summaries into brain_chunks
// Usage: node --env-file=.env.local _Murali-Second-Brain/fathom-sync.mjs

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const FATHOM_API = 'https://api.fathom.ai/external/v1';
const headers = {
  'X-Api-Key': process.env.FATHOM_API_KEY,
  'Content-Type': 'application/json',
};

async function getLastSync() {
  const { data } = await supabase
    .from('brain_sync_state')
    .select('last_synced')
    .eq('source', 'fathom')
    .single();
  return data?.last_synced ?? '1970-01-01';
}

async function setLastSync(ts) {
  await supabase
    .from('brain_sync_state')
    .update({ last_synced: ts })
    .eq('source', 'fathom');
}

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if (res.status === 502 && attempt < retries) {
      console.log(`  Fathom 502 on attempt ${attempt} — retrying in 10s…`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }
    throw new Error(`Fathom API error: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

async function fetchMeetings(since) {
  // Use created_after to filter server-side; include_summary avoids separate per-meeting API calls.
  // Pagination: response.next_cursor is the token; query param is `cursor` (not `next_cursor`).
  const all = [];
  let cursor = null;
  let pages = 0;

  while (pages < 50) { // safety cap: 500 meetings max per sync run
    const url = new URL(`${FATHOM_API}/meetings`);
    url.searchParams.set('created_after', since);
    url.searchParams.set('include_summary', 'true');
    if (cursor) url.searchParams.set('cursor', cursor);

    const data = await fetchPage(url.toString());
    const page = data.items ?? [];
    pages++;

    all.push(...page);

    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return all;
}

function extractSummary(meeting) {
  // inline summary from include_summary=true — field is default_summary.markdown_formatted
  const s = meeting.default_summary;
  if (!s) return null;
  return (typeof s === 'object' ? s.markdown_formatted : s) ?? null;
}

async function run() {
  console.log('Fathom sync starting...');
  const rawSince = await getLastSync();
  // Normalize Postgres +00:00 to Z so Fathom API accepts it
  const since = new Date(rawSince).toISOString();
  console.log(`Last sync: ${since}`);

  let meetings;
  try {
    meetings = await fetchMeetings(since);
  } catch (err) {
    console.error('Failed to fetch meetings:', err.message);
    process.exit(1);
  }

  console.log(`Found ${meetings.length} new meeting(s) since last sync.`);
  if (meetings.length === 0) return;

  let ingested = 0;
  const now = new Date().toISOString();

  for (const meeting of meetings) {
    const title = meeting.title ?? meeting.name ?? 'Untitled Meeting';
    const date = meeting.created_at ?? meeting.started_at ?? now;
    // Fathom meetings have no top-level `id`; recording_id is the stable unique key.
    const meetingId = meeting.recording_id ?? meeting.id;

    // Try to extract project tag from meeting title e.g. "[AdamritHMS] weekly standup"
    const prefixMatch = title.match(/^\[([^\]]+)\]/);
    const project_tag = prefixMatch ? prefixMatch[1] : '_inbox';
    const cleanTitle = prefixMatch ? title.slice(prefixMatch[0].length).trim() : title;

    const summary = extractSummary(meeting);
    if (!summary) {
      console.log(`  ⚠ No summary for: ${title} — skipping`);
      continue;
    }

    const text = `Meeting: ${cleanTitle}\nDate: ${date}\n\n${summary}`;

    await ingestText({
      text,
      project_tag,
      source_type: 'fathom',
      source_ref: `fathom://meetings/${meetingId}`,
      metadata: { title: cleanTitle, date, meeting_id: meetingId },
    });
    ingested++;
  }

  await setLastSync(now);
  console.log(`\nFathom sync complete. Ingested ${ingested} meeting(s).`);
}

run().catch(err => { console.error(err); process.exit(1); });
