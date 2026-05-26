// sync-calendar.mjs — pull Google Calendar events into the brain
// so @Bettroi can answer "what's on my calendar today/tomorrow/this week".
//
// Writes: _Calendar/YYYY-MM-DD.md per day in the next 14 days + past 7
// Run daily via GitHub Actions or launchd.

import ical from 'node-ical';
import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const CAL_DIR = join(VAULT_ROOT, '_Calendar');
const ICS_URL = process.env.GOOGLE_CAL_ICS_URL;

if (!ICS_URL) { console.error('GOOGLE_CAL_ICS_URL not set'); process.exit(1); }

const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 14;

function fmtTime(d) {
  return d.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
function fmtDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}
function fmtDateLong(d) {
  return d.toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

async function run() {
  console.log(`Fetching calendar...`);
  const events = await ical.async.fromURL(ICS_URL);
  const all = Object.values(events).filter(e => e.type === 'VEVENT' && e.start);
  console.log(`Total events: ${all.length}`);

  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 86400000);
  const to = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000);

  // Filter to the window
  const inWindow = all.filter(e => {
    const start = new Date(e.start);
    return start >= from && start <= to;
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  console.log(`Events in window (last ${LOOKBACK_DAYS}d + next ${LOOKAHEAD_DAYS}d): ${inWindow.length}`);

  // Group by date
  const byDate = {};
  for (const e of inWindow) {
    const d = fmtDate(new Date(e.start));
    (byDate[d] ??= []).push(e);
  }

  await mkdir(CAL_DIR, { recursive: true });

  // Clean old generated files (keep folder lean — we re-generate from scratch each run)
  try {
    const existing = await readdir(CAL_DIR);
    for (const f of existing) {
      if (f.endsWith('.md')) await unlink(join(CAL_DIR, f)).catch(() => {});
    }
  } catch {}

  let written = 0;
  for (const [dateStr, list] of Object.entries(byDate)) {
    const dateObj = new Date(dateStr + 'T12:00:00');
    const items = list.map(e => {
      const start = new Date(e.start);
      const end = e.end ? new Date(e.end) : null;
      const time = `${fmtTime(start)}${end ? '–' + fmtTime(end) : ''} IST`;
      const attendeesRaw = Array.isArray(e.attendee) ? e.attendee : (e.attendee ? [e.attendee] : []);
      const attendees = attendeesRaw.map(a => {
        const cn = a?.params?.CN || a?.val || a;
        return typeof cn === 'string' ? cn.replace(/^mailto:/, '') : String(cn);
      }).slice(0, 12);
      const desc = (e.description || '').toString().slice(0, 800);
      return `### ${time} — ${e.summary || '(untitled)'}\n\n` +
        (attendees.length ? `**Attendees:** ${attendees.join(', ')}\n\n` : '') +
        (e.location ? `**Location:** ${e.location}\n\n` : '') +
        (desc ? `${desc}\n\n` : '');
    });

    const fm = [
      '---',
      `date: ${dateStr}`,
      `type: calendar-day`,
      `source: google-calendar`,
      `event_count: ${list.length}`,
      `project: _Calendar`,
      'off_limits: false',
      '---',
      '',
    ].join('\n');

    const body = `# Calendar — ${fmtDateLong(dateObj)}\n\n*${list.length} event${list.length === 1 ? '' : 's'}*\n\n` + items.join('\n');

    await writeFile(join(CAL_DIR, `${dateStr}.md`), fm + body);
    written++;
  }

  console.log(`✓ Wrote ${written} day-files to ${CAL_DIR}`);
  console.log(`Next: npm run brain:obsidian   (ingests calendar into brain)`);
}

run().catch(e => { console.error(e); process.exit(1); });
