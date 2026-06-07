// slack-thread-sync.mjs — pull messages from designated Slack threads (the
// "use this thread for all <topic>" dev threads) into brain_chunks so the team
// and agents can query them. Usage: npm run brain:slack-threads
//
// Idempotent: clears a thread's prior chunks (by source_ref) before re-ingesting,
// so re-runs don't duplicate.

import { WebClient } from '@slack/web-api';
import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

// ── CONFIG — list the threads to sync ────────────────────────────────────────
// To get channel + thread_ts, open the thread in Slack → "Copy link":
//   https://<workspace>.slack.com/archives/<CHANNEL_ID>/p1718950000123456
//   channel   = the C......... id after /archives/
//   thread_ts = the digits after the trailing 'p', with a dot 6 from the right
//               (p1718950000123456  ->  1718950000.123456)
// The bot (SLACK_BOT_TOKEN) must be a member of each channel.
const THREADS = [
  // { label: 'Bajaj PIMS — dev & bugs', channel: 'C0XXXXXXX', thread_ts: '1718950000.123456' },
  // { label: 'Hope — dev & bugs',       channel: 'C0YYYYYYY', thread_ts: '1718950001.123456' },
];
// ─────────────────────────────────────────────────────────────────────────────

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

function requireEnv() {
  const m = ['SLACK_BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'OPENAI_API_KEY'].filter(k => !process.env[k]);
  if (m.length) { console.error(`Missing env var(s): ${m.join(', ')}`); process.exit(1); }
}

async function fetchReplies(channel, ts) {
  const msgs = [];
  let cursor;
  do {
    const res = await slack.conversations.replies({ channel, ts, limit: 200, cursor });
    if (!res.ok) throw new Error(`conversations.replies: ${res.error}`);
    msgs.push(...(res.messages ?? []));
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return msgs;
}

async function run() {
  requireEnv();
  if (!THREADS.length) {
    console.log('No threads configured. Add entries to THREADS in slack-thread-sync.mjs (see the header comment for how to get channel + thread_ts).');
    return;
  }
  let synced = 0;
  for (const t of THREADS) {
    const ref = `slack://${t.channel}/${t.thread_ts}`;
    let msgs;
    try {
      msgs = await fetchReplies(t.channel, t.thread_ts);
    } catch (e) {
      console.warn(`  ⚠ ${t.label}: ${e.message}`);
      continue;
    }
    // Idempotent re-sync: drop prior chunks for this thread first
    await brain.from('brain_chunks').delete().eq('source_ref', ref);

    const text = [
      `Slack thread: ${t.label}`,
      '',
      ...msgs.map(m => `[${m.ts}] ${m.user ?? m.username ?? '?'}: ${(m.text ?? '').replace(/\s+/g, ' ')}`),
    ].join('\n');

    const r = await ingestText({
      text,
      project_tag: t.label,
      source_type: 'slack',
      source_ref: ref,
      metadata: { label: t.label, channel: t.channel, thread_ts: t.thread_ts, message_count: msgs.length },
    });
    console.log(`  ${t.label}: ${msgs.length} message(s) -> ${r.inserted} chunk(s)${r.failed ? ` (${r.failed} failed)` : ''}`);
    synced++;
  }
  console.log(`\nslack-thread sync complete. Synced ${synced} thread(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
