// fathom-followup-drafter.mjs — for every Fathom call in the last N days with
// an external attendee, draft a follow-up email and save to _Email-Drafts/.
// Usage: node --env-file=.env.local _Murali-Second-Brain/fathom-followup-drafter.mjs [--days=2] [--dry]
//
// Output: _Email-Drafts/fathom-followup-YYYY-MM-DD-<attendee>.md
// Notifies Murali in Slack with a digest of drafts ready for review.

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const FATHOM_API = 'https://api.fathom.ai/external/v1';
const FATHOM_HEADERS = { 'X-Api-Key': process.env.FATHOM_API_KEY, 'Content-Type': 'application/json' };

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Email-Drafts');
const STATE_KEY = 'U_FATHOM_FOLLOWUP_DRAFTED';

const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '2', 10);
const DRY = process.argv.includes('--dry');

// Bettroi treats both as internal — Fathom only knows the recorder's domain.
const INTERNAL_DOMAINS = new Set(['bettroi.com', 'hopehospital.com', 'hopetech.me']);
function isInternalAttendee(a) {
  return !a.is_external || INTERNAL_DOMAINS.has((a.email_domain || a.email?.split('@')[1] || '').toLowerCase());
}

function normalizeSummary(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  // Fathom sometimes returns { sections: [{ heading, items: [...] }] } or similar
  if (Array.isArray(s)) return s.map(normalizeSummary).join('\n');
  if (typeof s === 'object') {
    const parts = [];
    for (const [k, v] of Object.entries(s)) parts.push(`${k}:\n${normalizeSummary(v)}`);
    return parts.join('\n\n');
  }
  return String(s);
}

function safeSlug(s) { return (s || 'untitled').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50); }

async function getDraftedSet() {
  const { data } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', STATE_KEY).maybeSingle();
  return new Set((data?.last_items_dm ?? []).map(String));
}

async function saveDraftedSet(set) {
  const arr = [...set].slice(-500).map(String);
  await supabase.from('brain_user_state').upsert({
    slack_user_id: STATE_KEY,
    last_items_dm: arr,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slack_user_id' });
}

async function fathomFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url, { headers: FATHOM_HEADERS });
    if (r.ok) return r;
    if (r.status < 500) return r; // 4xx is a real client error — don't retry
    if (i < retries - 1) {
      const wait = 1500 * (i + 1);
      console.log(`  ⟲ Fathom ${r.status} — retrying in ${wait}ms`);
      await new Promise(res => setTimeout(res, wait));
    } else {
      throw new Error(`Fathom API ${r.status} after ${retries} retries`);
    }
  }
}

async function fetchRecentMeetings() {
  const r = await fathomFetch(`${FATHOM_API}/meetings?limit=50`);
  const data = await r.json();
  const all = data.items ?? data.meetings ?? data.data ?? data.results ?? [];
  const cutoff = new Date(Date.now() - DAYS * 86400000);
  return all.filter(m => {
    const t = new Date(m.recording_end_time ?? m.created_at ?? m.scheduled_end_time ?? 0);
    return t > cutoff;
  });
}

async function fetchSummary(recordingId) {
  try {
    const r = await fathomFetch(`${FATHOM_API}/recordings/${recordingId}/summary`);
    if (!r.ok) return null;
    const d = await r.json();
    return normalizeSummary(d.summary ?? d.content ?? d.text ?? d.default_summary ?? d);
  } catch { return null; }
}

async function draftFollowup({ meeting, attendee, summary }) {
  const sys = `You draft a follow-up email for Dr. Murali after a Zoom call he just had with an external prospect/partner.

Tone: Direct, warm, decisive. NO "I hope this email finds you well". Mirror Murali's natural style — concise, specific, action-oriented.

Structure:
1. One-line greeting referencing the call ("Great talking with you earlier" or similar — vary it)
2. 2-3 bullets recapping the key things discussed/agreed
3. Clear next step(s) with owner + date if any were agreed
4. Optional one-line invitation to ask questions

Length: 90-150 words. NO Subject: line. Start with "Hi <FirstName>," and end with "—\\nMurali".`;

  const user = `MEETING: ${meeting.title}
DATE: ${meeting.recording_end_time?.slice(0,10) ?? meeting.created_at?.slice(0,10)}
ATTENDEE: ${attendee.name} (${attendee.email})

SUMMARY OF WHAT WAS DISCUSSED:
${(summary || '(no summary available)').slice(0, 4000)}

ACTION ITEMS captured by Fathom:
${(meeting.action_items ? JSON.stringify(meeting.action_items).slice(0, 1500) : '(none)')}

CALL LINK: ${meeting.share_url ?? meeting.url}

---

Draft the follow-up email body:`;

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  return res.content[0].text.trim();
}

async function run() {
  const meetings = await fetchRecentMeetings();
  console.log(`Found ${meetings.length} meeting(s) in the last ${DAYS} day(s).`);
  if (!meetings.length) return;

  const drafted = await getDraftedSet();
  await mkdir(TARGET_DIR, { recursive: true });

  const summaries = [];
  for (const meeting of meetings) {
    const externals = (meeting.calendar_invitees ?? []).filter(a => a.email && !isInternalAttendee(a));
    if (!externals.length) continue;

    // Skip meetings we've already drafted for
    const key = `${meeting.recording_id ?? meeting.id}`;
    if (drafted.has(key)) {
      console.log(`  ⊘ ${meeting.title} — already drafted, skipping`);
      continue;
    }

    console.log(`\n📞 ${meeting.title} (${meeting.recording_end_time?.slice(0,10)})`);
    const summary = await fetchSummary(meeting.recording_id ?? meeting.id);
    if (!summary && !meeting.action_items) {
      console.log(`  ⚠ no summary or action items — skipping`);
      continue;
    }

    for (const attendee of externals) {
      console.log(`  → drafting follow-up to ${attendee.name} <${attendee.email}>`);
      const body = await draftFollowup({ meeting, attendee, summary });

      const date = (meeting.recording_end_time ?? meeting.created_at ?? new Date().toISOString()).slice(0, 10);
      const slug = `${date}-fathom-followup-${safeSlug(attendee.name + '-' + meeting.title.slice(0,30))}`;
      const filepath = join(TARGET_DIR, `${slug}.md`);

      if (DRY) { console.log('  [DRY] would write:\n' + body.slice(0, 300) + '...'); continue; }

      const md = [
        '---',
        `date: ${date}`,
        `source: fathom-followup`,
        `to: ${JSON.stringify(attendee.email)}`,
        `to_name: ${JSON.stringify(attendee.name)}`,
        `meeting_title: ${JSON.stringify(meeting.title)}`,
        `fathom_url: ${meeting.share_url ?? meeting.url}`,
        `recording_id: ${meeting.recording_id ?? meeting.id}`,
        `off_limits: true`,
        '---',
        '',
        `# Follow-up to ${attendee.name} — ${meeting.title}`,
        '',
        `**To:** ${attendee.name} <${attendee.email}>`,
        `**Subject (suggested):** Re: ${meeting.title}`,
        `**Call:** ${meeting.share_url ?? meeting.url}`,
        '',
        '## Draft',
        '',
        '```',
        body,
        '```',
        '',
        '## Fathom summary used',
        '',
        '> ' + (summary ?? '(no summary)').slice(0, 2000).replace(/\n/g, '\n> '),
      ].join('\n');
      await writeFile(filepath, md);
      summaries.push({ to: attendee.email, name: attendee.name, meeting: meeting.title, file: filepath, fathom: meeting.share_url ?? meeting.url });
    }
    drafted.add(key);
  }

  if (!DRY) await saveDraftedSet(drafted);
  console.log(`\n✓ Drafted ${summaries.length} follow-up email(s)`);

  if (slack && process.env.SLACK_MURALI_USER_ID && summaries.length && !DRY) {
    const lines = summaries.map((s, i) =>
      `${i+1}. *${s.meeting.slice(0, 50)}* → ${s.name} <${s.to}>\n     <${s.fathom}|Fathom>`
    );
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `📧 *${summaries.length} Fathom follow-up draft${summaries.length===1?'':'s'} ready*\n\n${lines.join('\n')}\n\nOpen \`_Email-Drafts/\` in Obsidian. Files start with \`*fathom-followup*\`.`,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
