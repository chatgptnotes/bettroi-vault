// nudge-dev-assignments.mjs — read dev_work_items from the BNI Supabase,
// match developers to brain_user_roles by name, DM each developer their open work.
// Usage: node --env-file=.env.local _Murali-Second-Brain/nudge-dev-assignments.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const bni   = createClient(process.env.BNI_SUPABASE_URL, process.env.BNI_SUPABASE_ANON_KEY);
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const DRY = process.argv.includes('--dry');
const STATE_ICON = { 'To Do': '📋', 'In Progress': '⚙️', 'Review': '🔍', 'Done': '✅' };
const PRI_ICON   = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };

function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function matchSlack(devName, slackUsers) {
  // Strip parenthetical info like "(Morning Shift...)"
  const clean = devName.replace(/\(.*?\)/g, '').trim();
  const cleanNorm = norm(clean);
  const firstWord = norm(clean.split(/\s+/)[0]);

  // Exact contains (Slack display has parenthetical role suffixes)
  for (const u of slackUsers) {
    if (norm(u.display_name).includes(cleanNorm)) return u;
  }
  // First-name match
  for (const u of slackUsers) {
    if (norm(u.display_name).includes(firstWord)) return u;
  }
  return null;
}

async function run() {
  // BNI Supabase: dev data
  const { data: projects } = await bni.from('dev_projects').select('id,name');
  const { data: devs }     = await bni.from('developers').select('id,name,role');
  const { data: items }    = await bni.from('dev_work_items')
    .select('title, state, assignee_id, priority, type, due_date, project_id, description')
    .neq('state', 'Done');

  // Brain Supabase: Slack users
  const { data: slackUsers } = await brain.from('brain_user_roles').select('slack_user_id, display_name');

  const projById = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const devById  = Object.fromEntries(devs.map(d => [d.id, d]));

  // Group items by developer
  const byDev = {};
  for (const it of items) {
    const dev = devById[it.assignee_id];
    if (!dev) continue;
    (byDev[dev.id] ??= { dev, items: [] }).items.push(it);
  }

  console.log(`${Object.keys(byDev).length} developers have open work items.\n`);

  // Build ONE consolidated brief for all developers — sent to a shared Slack ID
  // (all developers share chatgptnotes@gmail.com / U0B2NR9MWHZ per Murali's instruction)
  const SHARED_RECIPIENT = process.env.DEV_TEAM_SLACK_USER_ID ?? 'U0B2NR9MWHZ';

  const today = new Date().toISOString().slice(0, 10);
  const sections = [];
  let totalItems = 0;

  // Sort developers by # of items DESC for top-of-message visibility
  const sortedDevs = Object.values(byDev).sort((a, b) => b.items.length - a.items.length);

  for (const { dev, items: theirItems } of sortedDevs) {
    const sortedItems = theirItems.sort((a, b) => {
      const pri = ['Critical','High','Medium','Low'];
      return pri.indexOf(a.priority) - pri.indexOf(b.priority);
    });

    const lines = sortedItems.map((i, idx) => {
      const stateIcon = STATE_ICON[i.state] ?? '·';
      const priIcon = PRI_ICON[i.priority] ?? '⚪';
      const project = projById[i.project_id] ?? '?';
      const due = i.due_date ? `  _(due ${i.due_date})_` : '';
      return `   ${idx+1}. ${stateIcon} ${priIcon} *${i.title}*  ·  _${project}_${due}`;
    });

    const cleanName = dev.name.replace(/\(.*?\)/g, '').trim();
    sections.push(`*${cleanName}* — ${theirItems.length} item${theirItems.length === 1 ? '' : 's'}\n${lines.join('\n')}`);
    totalItems += theirItems.length;
  }

  const header = `📋 *Daily Engineering Board — ${today}*\nTotal: *${totalItems}* open items across *${sortedDevs.length}* developers\n\nView the full board: https://hopetech.me/bni/dev-boards.html\n`;
  const text = header + '\n' + sections.join('\n\n');

  if (DRY) {
    console.log(`[DRY] Would send to ${SHARED_RECIPIENT}:\n\n${text.slice(0, 1500)}${text.length > 1500 ? '\n\n... (truncated, total ' + text.length + ' chars)' : ''}`);
    return;
  }

  try {
    const open = await slack.conversations.open({ users: SHARED_RECIPIENT });
    await slack.chat.postMessage({ channel: open.channel.id, text });
    console.log(`✓ Sent consolidated brief to ${SHARED_RECIPIENT} (${totalItems} items, ${sortedDevs.length} devs)`);
  } catch (e) {
    console.warn(`✗ Failed to DM ${SHARED_RECIPIENT}: ${e.message}`);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
