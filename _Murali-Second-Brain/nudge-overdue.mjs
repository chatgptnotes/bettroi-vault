// nudge-overdue.mjs — DM each team member their overdue + due-today action items
// Usage: node --env-file=.env.local _Murali-Second-Brain/nudge-overdue.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const DRY = process.argv.includes('--dry');

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map an assignee string ("Biji", "Dr Murali", "BT") to a Slack user_id from brain_user_roles
function matchAssignee(assignee, users) {
  if (!assignee) return null;
  const norm = normalize(assignee);
  // exact display_name contains the assignee
  for (const u of users) {
    if (normalize(u.display_name).includes(norm)) return u;
  }
  // first-name match
  const firstWord = assignee.split(/\s+/)[0];
  if (firstWord !== assignee) {
    for (const u of users) {
      if (normalize(u.display_name).includes(normalize(firstWord))) return u;
    }
  }
  // common alias
  const ALIASES = { 'bt': 'Biji', 'bk': 'Murali', 'drmurali': 'Murali' };
  const aliased = ALIASES[norm];
  if (aliased) {
    for (const u of users) {
      if (normalize(u.display_name).includes(normalize(aliased))) return u;
    }
  }
  return null;
}

async function run() {
  // Pull users + open items (overdue or due today)
  const today = new Date().toISOString().slice(0, 10);
  const { data: users } = await supabase.from('brain_user_roles').select('slack_user_id, display_name');
  const { data: items } = await supabase
    .from('brain_action_items')
    .select('id, item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open')
    .or(`due_date.lte.${today},priority.eq.high`)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (!items?.length) { console.log('No overdue items.'); return; }

  // Group items by matched Slack user
  const byUser = {};
  let unmatched = 0;
  for (const it of items) {
    const u = matchAssignee(it.assignee, users ?? []);
    if (!u) { unmatched++; continue; }
    if (!byUser[u.slack_user_id]) byUser[u.slack_user_id] = { user: u, items: [] };
    byUser[u.slack_user_id].items.push(it);
  }

  console.log(`Open items: ${items.length}  ·  Matched to users: ${items.length - unmatched}  ·  Unmatched: ${unmatched}`);

  for (const { user, items: theirItems } of Object.values(byUser)) {
    // Sort: overdue first, then high-priority
    const sorted = theirItems.sort((a, b) => {
      const ao = a.due_date && a.due_date <= today ? 1 : 0;
      const bo = b.due_date && b.due_date <= today ? 1 : 0;
      if (ao !== bo) return bo - ao;
      return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
    });

    const overdue = sorted.filter(i => i.due_date && i.due_date <= today).length;
    const high    = sorted.filter(i => i.priority === 'high' && !(i.due_date && i.due_date <= today)).length;

    const lines = sorted.slice(0, 10).map((a, idx) => {
      const isOver = a.due_date && a.due_date <= today;
      const due = a.due_date ? `  (due ${a.due_date}${isOver ? ' ⚠ OVERDUE' : ''})` : '';
      const pri = a.priority === 'high' ? ' 🔥' : '';
      return `${idx+1}. *${a.item_text.slice(0, 200)}*${pri}${due}\n   _${a.project_tag}_  ·  reply \`done ${idx+1}\` to close, \`snooze ${idx+1} YYYY-MM-DD\` to defer`;
    });

    const text = `*${user.display_name}* — you have *${overdue}* overdue + *${high}* high-priority item${theirItems.length === 1 ? '' : 's'}:\n\n${lines.join('\n\n')}\n\n_Reply in this DM:_ \`done N\` to mark complete · \`snooze N YYYY-MM-DD\` to reschedule · \`my items\` for the full list`;

    if (DRY) {
      console.log(`\n[DRY] Would DM ${user.display_name} (${user.slack_user_id}):\n${text.slice(0, 400)}...`);
    } else {
      try {
        const open = await slack.conversations.open({ users: user.slack_user_id });
        await slack.chat.postMessage({ channel: open.channel.id, text });
        // Persist the order so done/snooze commands resolve correctly
        await supabase.from('brain_user_state').upsert({
          slack_user_id: user.slack_user_id,
          last_items_dm: sorted.slice(0, 10).map(i => i.id),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'slack_user_id' });
        console.log(`✓ Nudged ${user.display_name} with ${sorted.length} item(s)`);
      } catch (e) {
        console.warn(`✗ Failed to DM ${user.display_name}: ${e.message}`);
      }
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
