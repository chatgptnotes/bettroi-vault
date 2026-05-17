// fathom-sync.mjs — pull all Fathom meeting summaries into brain_chunks
// Usage: node --env-file=.env.local _Murali-Second-Brain/fathom-sync.mjs

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const FATHOM_API = 'https://api.fathom.video/v1';
const headers = {
  'Authorization': `Bearer ${process.env.FATHOM_API_KEY}`,
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

async function fetchMeetings(since) {
  // Fathom API: list calls (meetings)
  const url = `${FATHOM_API}/calls?limit=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fathom API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  // Filter to meetings newer than last sync
  const sinceDate = new Date(since);
  return (data.calls ?? data.data ?? []).filter(m => new Date(m.created_at ?? m.started_at) > sinceDate);
}

async function fetchSummary(callId) {
  const res = await fetch(`${FATHOM_API}/calls/${callId}/summary`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  return data.summary ?? data.content ?? null;
}

async function run() {
  console.log('Fathom sync starting...');
  const since = await getLastSync();
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

    // Try to extract project tag from meeting title e.g. "[AdamritHMS] weekly standup"
    const prefixMatch = title.match(/^\[([^\]]+)\]/);
    const project_tag = prefixMatch ? prefixMatch[1] : '_inbox';
    const cleanTitle = prefixMatch ? title.slice(prefixMatch[0].length).trim() : title;

    // Get full summary
    const summary = await fetchSummary(meeting.id);
    if (!summary) {
      console.log(`  ⚠ No summary for: ${title} — skipping`);
      continue;
    }

    const text = `Meeting: ${cleanTitle}\nDate: ${date}\n\n${summary}`;

    await ingestText({
      text,
      project_tag,
      source_type: 'fathom',
      source_ref: `fathom://calls/${meeting.id}`,
      metadata: { title: cleanTitle, date, meeting_id: meeting.id },
    });
    ingested++;
  }

  await setLastSync(now);
  console.log(`\nFathom sync complete. Ingested ${ingested} meeting(s).`);
}

run().catch(err => { console.error(err); process.exit(1); });
