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

// Google Calendar descriptions arrive as HTML. Slack `text` is mrkdwn, not HTML,
// so tags render literally. Convert to clean plain text before sending.
function htmlToText(html) {
  if (!html) return '';
  return String(html)
    // collapse <a href="X">X</a> to a single value (avoid showing the URL twice)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const text = label.replace(/<[^>]+>/g, '').trim();
      return text && text !== href ? `${text} (${href})` : href;
    })
    // block-level tags become line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    // drop all remaining tags
    .replace(/<[^>]+>/g, '')
    // decode common entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // tidy whitespace
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

async function prepText(meetingTitle, role = 'murali', focusPerson = null) {
  const { queryBrain } = await import('./query.mjs');
  const personHint = focusPerson
    ? ` Highlight what specifically concerns ${focusPerson} — their open commitments, what they need to bring, what they should be ready to answer.`
    : '';
  const { answer, sources } = await queryBrain({
    question: `Pre-meeting briefing on "${meetingTitle}". Cover: (1) key people, (2) latest decisions/status, (3) open commitments. Concise: 5-8 bullets. Use names/dates from sources.${personHint}`,
    role,
  });
  const srcList = sources.slice(0, 3).map((s, i) => `[${i+1}] ${s}`).join('\n');
  return { answer, srcList };
}

// Match a calendar attendee (name or email) to a brain_user_roles entry
function matchAttendee(attendeeRaw, slackUsers) {
  if (!attendeeRaw) return null;
  const lc = String(attendeeRaw).toLowerCase();
  // Try name match first (CN field gives display name)
  for (const u of slackUsers) {
    const nameNorm = u.display_name.toLowerCase().replace(/\(.*?\)/g, '').trim();
    if (lc.includes(nameNorm) || nameNorm.split(/\s+/).some(part => part.length > 2 && lc.includes(part))) {
      return u;
    }
  }
  // Try email local-part match
  if (lc.includes('@')) {
    const local = lc.split('@')[0];
    for (const u of slackUsers) {
      const firstName = u.display_name.toLowerCase().split(/\s+|[(]/)[0];
      if (firstName && local.includes(firstName)) return u;
    }
  }
  return null;
}

async function processEvent(event, notified, slackUsers) {
  const now = new Date();
  const start = new Date(event.start);
  const minutesAhead = (start - now) / 60000;

  if (minutesAhead < MIN_AHEAD_MIN || minutesAhead > MAX_AHEAD_MIN) return false;
  if (notified.has(event.uid)) return false;

  const title = event.summary || '(untitled meeting)';
  const startStr = start.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const attendeesRaw = (event.attendee || []).map(a => {
    const cn = a.params?.CN || a.val || a;
    return typeof cn === 'string' ? cn.replace(/^mailto:/, '') : String(cn);
  });

  console.log(`📅 ${title} — starts ${startStr} IST (${Math.round(minutesAhead)} min from now). ${attendeesRaw.length} attendees.`);

  // Resolve who on the team will be in this meeting
  const recipients = new Map();  // slack_user_id → {user, name}
  // Murali always gets a brief
  recipients.set(process.env.SLACK_MURALI_USER_ID, { user: { display_name: 'Murali', role: 'murali' }, focusPerson: null });

  for (const att of attendeesRaw.slice(0, 12)) {
    const matched = matchAttendee(att, slackUsers ?? []);
    if (matched && !recipients.has(matched.slack_user_id)) {
      recipients.set(matched.slack_user_id, { user: matched, focusPerson: matched.display_name.replace(/\(.*?\)/g, '').trim() });
    }
  }

  const headerCore = `*Meeting:* ${title}\n*Starts:* ${startStr} IST (in ${Math.round(minutesAhead)} min)${attendeesRaw.length ? `\n*Attendees:* ${attendeesRaw.slice(0, 8).join(', ')}` : ''}\n${event.location ? `*Location:* ${event.location}\n` : ''}${event.description ? `\n*Agenda:*\n${htmlToText(event.description).slice(0, 400)}\n` : ''}`;

  for (const [slackId, { user, focusPerson }] of recipients.entries()) {
    let brief = '';
    try {
      const { answer, srcList } = await prepText(title, user.role || 'public', user.role === 'murali' ? null : focusPerson);
      brief = `\n\n${answer}${srcList ? '\n\n*Sources:*\n' + srcList : ''}`;
    } catch (e) {
      const quota = e.status === 429 || /quota|exceeded|429|insufficient/i.test(e.message || '');
      brief = quota
        ? `\n\n_(Briefing skipped — brain is temporarily unavailable.)_`
        : `\n\n_(Briefing unavailable right now.)_`;
      console.warn(`  ! brain query failed${quota ? ' (quota/429)' : ''}: ${e.message}`);
    }
    const greeting = user.role === 'murali' ? '🧭 *Pre-meeting briefing*\n' : `🧭 *Heads-up — meeting in ${Math.round(minutesAhead)} min*\nYou're invited to a meeting Dr. Murali is attending. Here's context relevant to you.\n\n`;
    const text = `${greeting}${headerCore}${brief}`;

    if (DRY) {
      console.log(`[DRY] → ${user.display_name || slackId}:`, text.slice(0, 400), '...');
    } else {
      try {
        const open = await slack.conversations.open({ users: slackId });
        await slack.chat.postMessage({ channel: open.channel.id, text });
        console.log(`  ✓ DM sent to ${user.display_name || slackId}`);
      } catch (e) {
        console.warn(`  ✗ DM failed for ${slackId}: ${e.message}`);
      }
    }
  }

  notified.add(event.uid);
  return true;
}

// Probe both AI engines so Murali learns of an outage BEFORE a meeting, not during.
// Primary = Anthropic credits; Fallback = nexaproc VPS gateway (reached via the SSH tunnel).
const HEALTH_KEY = 'U_BRAIN_HEALTH';

async function checkEngines() {
  let primaryOk = false, primaryMsg = '';
  try {
    const { anthropic } = await import('./ai-client.mjs');
    await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
    primaryOk = true;
  } catch (e) {
    primaryMsg = /credit|balance|insufficient|quota|billing/i.test(e.message || '') ? 'out of credits' : (e.message || 'error').slice(0, 80);
  }

  let fallbackOk = false, fallbackMsg = '';
  try {
    const resp = await fetch(process.env.NEXAPROC_VPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nexaproc-Key': process.env.NEXAPROC_VPS_KEY || '' },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    });
    fallbackOk = resp.status > 0; // any HTTP reply means the tunnel + gateway are alive
  } catch (e) {
    fallbackMsg = /timeout|abort/i.test(e.message || '') ? 'unreachable (tunnel down?)' : (e.message || 'error').slice(0, 80);
  }
  return { primaryOk, primaryMsg, fallbackOk, fallbackMsg };
}

async function healthAlert() {
  const muraliId = process.env.SLACK_MURALI_USER_ID;
  if (!muraliId) return;
  const { primaryOk, primaryMsg, fallbackOk, fallbackMsg } = await checkEngines();
  const status = primaryOk ? 'ok' : (fallbackOk ? 'degraded' : 'down');

  const { data } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', HEALTH_KEY).maybeSingle();
  const prev = data?.last_items_dm?.[0] ?? 'ok';
  if (status === prev) { console.log(`Health: ${status} (unchanged, no alert).`); return; }

  const text = status === 'down'
    ? `🔴 *Brain DOWN* — pre-meeting briefings will be blank.\n• Main (Anthropic): ${primaryMsg}\n• Backup (VPS): ${fallbackMsg}\nFix one to restore briefings.`
    : status === 'degraded'
    ? `🟡 *Running on backup* — main brain (Anthropic) is ${primaryMsg}. Briefings still work via the VPS gateway, but top up Anthropic credits to restore the primary (and speed).`
    : `🟢 *Brain healthy again* — main brain (Anthropic) is back.`;

  if (DRY) {
    console.log(`[DRY] health alert (${prev}→${status}):`, text);
    return;
  }
  try {
    const open = await slack.conversations.open({ users: muraliId });
    await slack.chat.postMessage({ channel: open.channel.id, text });
  } catch (e) { console.warn(`health DM failed: ${e.message}`); }
  await supabase.from('brain_user_state').upsert(
    { slack_user_id: HEALTH_KEY, last_items_dm: [status], updated_at: new Date().toISOString() },
    { onConflict: 'slack_user_id' });
  console.log(`Health: ${prev} → ${status} (alerted Murali).`);
}

async function run() {
  await healthAlert();
  console.log(`Fetching calendar at ${new Date().toISOString()}...`);
  const events = await ical.async.fromURL(ICS_URL);
  const all = Object.values(events).filter(e => e.type === 'VEVENT');
  console.log(`Calendar has ${all.length} total events.`);

  const notified = await getNotifiedSet();

  // Pull team roster ONCE per run
  const { data: slackUsers } = await supabase.from('brain_user_roles').select('slack_user_id, display_name, role');
  console.log(`Roster: ${slackUsers?.length ?? 0} team members for attendee matching.`);

  // Find events starting in our notification window (today + tomorrow)
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let sent = 0;
  for (const event of all) {
    if (!event.start) continue;
    const start = new Date(event.start);
    if (start < now || start > cutoff) continue;
    if (await processEvent(event, notified, slackUsers)) sent++;
  }

  if (sent && !DRY) await saveNotified(notified);
  console.log(`Done. Sent ${sent} pre-meeting brief(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
