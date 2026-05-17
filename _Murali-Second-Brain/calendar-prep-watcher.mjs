// calendar-prep-watcher.mjs — fetches Google Calendar ICS, finds upcoming meetings,
// sends pre-meeting briefing to Murali's Slack DM ~20 min before each.
// Idempotent: tracks notified events in brain_user_state.
// Usage: node --env-file=.env.local _Murali-Second-Brain/calendar-prep-watcher.mjs [--dry]

import ical from 'node-ical';
import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';

const ICS_URL = process.env.GOOGLE_CAL_ICS_URL;
if (!ICS_URL) { console.error('GOOGLE_CAL_ICS_URL not set in .env.local'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const DRY = process.argv.includes('--dry');

// Window: notify if meeting starts in 15-35 min from now
const MIN_AHEAD_MIN = 15;
const MAX_AHEAD_MIN = 35;
const STATE_KEY = 'U_CALENDAR_NOTIFIED';

async function getNotifiedSet() {
  const { data } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', STATE_KEY).maybeSingle();
  return new Set((data?.last_items_dm ?? []));
}

async function saveNotified(set) {
  const arr = [...set].slice(-200); // keep last 200 to prevent unbounded growth
  await supabase.from('brain_user_state').upsert({
    slack_user_id: STATE_KEY,
    last_items_dm: arr,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slack_user_id' });
}

async function prepText(meetingTitle) {
  // Reuse the same brain query pattern as the bot's `prep` command
  const { queryBrain } = await import('./query.mjs');
  const { answer, sources } = await queryBrain({
    question: `Pre-meeting briefing on "${meetingTitle}". Cover: (1) key people, (2) latest decisions/status, (3) open commitments. Concise: 5-8 bullets. Use names/dates from sources.`,
    role: 'murali',
  });
  const srcList = sources.slice(0, 3).map((s, i) => `[${i+1}] ${s}`).join('\n');
  return { answer, srcList };
}

async function processEvent(event, notified) {
  const now = new Date();
  const start = new Date(event.start);
  const minutesAhead = (start - now) / 60000;

  if (minutesAhead < MIN_AHEAD_MIN || minutesAhead > MAX_AHEAD_MIN) return false;
  if (notified.has(event.uid)) return false;

  const title = event.summary || '(untitled meeting)';
  const startStr = start.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const attendees = (event.attendee || []).map(a => {
    const cn = a.params?.CN || a.val || a;
    return typeof cn === 'string' ? cn.replace(/^mailto:/, '') : String(cn);
  }).slice(0, 8);

  console.log(`📅 ${title} — starts ${startStr} IST (${Math.round(minutesAhead)} min from now)`);

  let brief = '';
  try {
    const { answer, srcList } = await prepText(title);
    brief = `\n\n${answer}${srcList ? '\n\n*Sources:*\n' + srcList : ''}`;
  } catch (e) {
    brief = `\n\n_(Brain query failed: ${e.message})_`;
  }

  const text = `🧭 *Pre-meeting briefing*\n*Meeting:* ${title}\n*Starts:* ${startStr} IST (in ${Math.round(minutesAhead)} min)${attendees.length ? `\n*Attendees:* ${attendees.join(', ')}` : ''}\n${event.location ? `*Location:* ${event.location}\n` : ''}${event.description ? `\n*Agenda:*\n${event.description.slice(0, 400)}\n` : ''}${brief}`;

  if (DRY) {
    console.log('[DRY]', text.slice(0, 600), '...');
  } else {
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({ channel: open.channel.id, text });
    console.log(`  ✓ DM sent`);
  }

  notified.add(event.uid);
  return true;
}

async function run() {
  console.log(`Fetching calendar at ${new Date().toISOString()}...`);
  const events = await ical.async.fromURL(ICS_URL);
  const all = Object.values(events).filter(e => e.type === 'VEVENT');
  console.log(`Calendar has ${all.length} total events.`);

  const notified = await getNotifiedSet();

  // Find events starting in our notification window (today + tomorrow)
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let sent = 0;
  for (const event of all) {
    if (!event.start) continue;
    const start = new Date(event.start);
    if (start < now || start > cutoff) continue;
    if (await processEvent(event, notified)) sent++;
  }

  if (sent && !DRY) await saveNotified(notified);
  console.log(`Done. Sent ${sent} pre-meeting brief(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
