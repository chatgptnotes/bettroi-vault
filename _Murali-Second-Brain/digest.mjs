// digest.mjs — Phase C: daily project-context digest
// Usage:
//   npm run brain:digest           # post to Murali's Slack DM
//   npm run brain:digest -- --dry  # print to terminal, don't post
//
// Schedule it via launchd / cron / GitHub Actions to run daily at 07:30 IST.

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import { callClaude } from './ai-client.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const DRY = process.argv.includes('--dry');
const LOOKBACK_DAYS = 7;
const TOP_PROJECTS = 5;
const CHUNKS_PER_PROJECT = 8;

const SKIP_PROJECTS = new Set(['_inbox', 'vault-root', 'clippings', 'agents', 'corpus', 'glossary', 'decisions']);

async function topActiveProjects() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const { data, error } = await supabase
    .from('brain_chunks')
    .select('project_tag')
    .gte('created_at', since)
    .eq('off_limits', false);
  if (error) throw error;

  const counts = {};
  for (const r of data) {
    if (SKIP_PROJECTS.has(r.project_tag)) continue;
    counts[r.project_tag] = (counts[r.project_tag] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PROJECTS)
    .map(([tag, count]) => ({ tag, count }));
}

async function recentChunksFor(projectTag) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const { data } = await supabase
    .from('brain_chunks')
    .select('content, source_type, source_ref, created_at')
    .eq('project_tag', projectTag)
    .eq('off_limits', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(CHUNKS_PER_PROJECT);
  return data ?? [];
}

async function summarizeProject(projectTag, chunks) {
  const context = chunks.map((c, i) =>
    `[${i+1}] (${c.source_type} — ${c.created_at.slice(0, 10)})\n${c.content}`
  ).join('\n\n---\n\n');

  const msg = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    messages: [{
      role: 'user',
      content: `You are summarizing recent activity for Murali on the project "${projectTag}" — based on his own notes, meetings, and Slack threads from the last ${LOOKBACK_DAYS} days.

Write a punchy 3-5 bullet summary covering:
- Latest decisions or status
- Open items / things needing follow-up
- Anything urgent or time-sensitive

Be specific. Use names, numbers, and concrete details from the sources. No preamble.

Sources:
${context}`
    }]
  });
  return msg.content[0].text.trim();
}

function fmtDateIST() {
  const now = new Date();
  return now.toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

async function topOpenActionItems(limit = 10) {
  // High-priority + overdue + recent
  const today = new Date().toISOString().slice(0, 10);
  const { data: overdue } = await supabase
    .from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open')
    .not('due_date', 'is', null)
    .lte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit);

  const { data: high } = await supabase
    .from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open')
    .eq('priority', 'high')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Dedupe (overdue may overlap with high)
  const seen = new Set();
  const items = [];
  for (const a of [...(overdue ?? []), ...(high ?? [])]) {
    const key = a.item_text;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(a);
    if (items.length >= limit) break;
  }
  return items;
}

async function buildBlocks(projects) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🧠 Morning brief — ${fmtDateIST()}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Top ${projects.length} active projects + open action items` }] },
    { type: 'divider' },
  ];

  // Action items section first — what needs your attention TODAY
  const items = await topOpenActionItems(8);
  if (items.length) {
    const today = new Date().toISOString().slice(0, 10);
    const lines = items.map(a => {
      const who = a.assignee ? `*${a.assignee}*` : '_unassigned_';
      const overdue = a.due_date && a.due_date <= today;
      const due = a.due_date ? ` _(due ${a.due_date}${overdue ? ' ⚠ OVERDUE' : ''})_` : '';
      const pri = a.priority === 'high' ? ' 🔥' : '';
      return `• ${who}${pri}: ${a.item_text.slice(0, 140)}${due}  · _${a.project_tag}_`;
    });
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: `*🎯 Open action items needing attention*\n${lines.join('\n')}` } },
      { type: 'divider' },
    );
  }

  // Project activity section
  for (const p of projects) {
    const chunks = await recentChunksFor(p.tag);
    if (!chunks.length) continue;
    console.log(`  → summarizing ${p.tag} (${chunks.length} chunks)`);
    const summary = await summarizeProject(p.tag, chunks);
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: `*${p.tag}*  _(${p.count} updates)_\n${summary}` } },
      { type: 'divider' },
    );
  }
  return blocks;
}

async function run() {
  console.log(`Building morning digest — ${fmtDateIST()}`);
  const projects = await topActiveProjects();
  if (!projects.length) {
    console.log('No recent project activity. Nothing to send.');
    return;
  }
  console.log(`Top projects: ${projects.map(p => `${p.tag}(${p.count})`).join(', ')}`);

  const blocks = await buildBlocks(projects);

  if (DRY) {
    console.log('\n--- DRY RUN — would post these blocks to Slack: ---\n');
    console.log(JSON.stringify(blocks, null, 2));
    return;
  }

  // Open a DM with Murali and post
  const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
  await slack.chat.postMessage({
    channel: open.channel.id,
    text: `Morning brief — ${fmtDateIST()}`,
    blocks,
  });
  console.log(`✓ Digest posted to Murali's DM`);
}

run().catch(err => { console.error(err); process.exit(1); });
