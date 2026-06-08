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

async function fetchMeetings(since) {
  const url = `${FATHOM_API}/meetings?limit=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fathom API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const sinceDate = new Date(since);
  return (data.items ?? data.meetings ?? data.data ?? data.results ?? []).filter(
    m => new Date(m.created_at ?? m.started_at ?? m.date) > sinceDate
  );
}

async function fetchSummary(meeting) {
  // Fathom returns recording_id on the meeting object; fall back to meeting.id
  const recordingId = meeting.recording_id ?? meeting.id;
  const res = await fetch(`${FATHOM_API}/recordings/${recordingId}/summary`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  // Fathom returns { summary: { template_name, markdown_formatted } } — pull the markdown.
  const sum = data.summary;
  return (sum && typeof sum === 'object' ? sum.markdown_formatted : sum) ?? data.content ?? data.text ?? null;
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
    // Fathom meetings have no top-level `id`; recording_id is the stable unique key.
    const meetingId = meeting.recording_id ?? meeting.id;

    // Try to extract project tag from meeting title e.g. "[AdamritHMS] weekly standup"
    const prefixMatch = title.match(/^\[([^\]]+)\]/);
    const project_tag = prefixMatch ? prefixMatch[1] : '_inbox';
    const cleanTitle = prefixMatch ? title.slice(prefixMatch[0].length).trim() : title;

    // Get full summary
    const summary = await fetchSummary(meeting);
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
