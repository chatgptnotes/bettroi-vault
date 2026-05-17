// weekly-review.mjs — generates _Weekly-Reviews/YYYY-Www.md every Sunday
// Comprehensive look back at the past week + look ahead to next week.

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const bni   = process.env.BNI_SUPABASE_URL
  ? createClient(process.env.BNI_SUPABASE_URL, process.env.BNI_SUPABASE_ANON_KEY)
  : null;
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekBounds() {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 86400000);
  const prior = new Date(now.getTime() - 14 * 86400000);
  return {
    weekStart: start.toISOString(),
    weekStartDate: start.toISOString().slice(0, 10),
    priorWeekStart: prior.toISOString(),
    weekEndDate: now.toISOString().slice(0, 10),
  };
}

async function getCompletedItems(start) {
  const { data } = await brain.from('brain_action_items')
    .select('item_text, assignee, project_tag, completed_at')
    .eq('status', 'done').gte('completed_at', start);
  return data ?? [];
}

async function getNewItems(start) {
  const { data } = await brain.from('brain_action_items')
    .select('item_text, assignee, project_tag, priority, due_date, status, created_at')
    .gte('created_at', start);
  return data ?? [];
}

async function getOpenOverdue() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await brain.from('brain_action_items')
    .select('item_text, assignee, project_tag, due_date')
    .eq('status', 'open').not('due_date', 'is', null).lte('due_date', today);
  return data ?? [];
}

async function getProjectActivity(start) {
  const { data } = await brain.from('brain_chunks')
    .select('project_tag, source_type')
    .gte('created_at', start).eq('off_limits', false);
  const byProject = {}, bySource = {};
  for (const c of data ?? []) {
    if (!['_inbox','vault-root','clippings','agents','corpus','glossary','decisions'].includes(c.project_tag)) {
      byProject[c.project_tag] = (byProject[c.project_tag] || 0) + 1;
    }
    bySource[c.source_type] = (bySource[c.source_type] || 0) + 1;
  }
  return { byProject, bySource };
}

async function getNewInsights(start) {
  const { data } = await brain.from('brain_insights')
    .select('insight_type, title, severity, recommended_action, projects')
    .gte('detected_at', start);
  return data ?? [];
}

async function getNewBniContacts(start) {
  if (!bni) return [];
  const { data } = await bni.from('bni_contacts')
    .select('first, last, company, city, chapter, segment, status')
    .gte('updated_at', start).eq('hidden', false);
  return data ?? [];
}

async function getRecentMeetings(start) {
  const { data } = await brain.from('brain_chunks')
    .select('source_ref, project_tag, metadata, created_at, content')
    .like('source_ref', '%/meetings/%')
    .gte('created_at', start);
  // Dedupe by source_ref
  const seen = new Set();
  const meetings = [];
  for (const c of data ?? []) {
    if (seen.has(c.source_ref)) continue;
    seen.add(c.source_ref);
    meetings.push({ ref: c.source_ref, project: c.project_tag, content: c.content.slice(0, 400) });
  }
  return meetings;
}

async function aiNarrative({ completed, newItems, overdue, insights, meetings, projectActivity, bniNew }) {
  const sys = `You write a candid, executive-style weekly review for Murali (hospital owner + AI consulting CEO).
Be concrete and specific — use real names, projects, numbers. No fluff. Direct tone, like a chief of staff briefing.

Cover, in this order:
1. **Top wins** — biggest 2-3 accomplishments
2. **Slippage** — what slipped or stayed open longer than expected
3. **Trending** — what topics/projects dominated the week
4. **Strategic flags** — insights, contradictions, things needing his attention
5. **Look ahead** — what to focus on this coming week

Length: 250-400 words. Use markdown with section headings.`;

  const data = `**Completed action items this week (${completed.length}):**\n` +
    completed.slice(0, 30).map(i => `- ${i.assignee || '?'}: ${i.item_text} (${i.project_tag})`).join('\n') +
    `\n\n**New action items created this week (${newItems.length}):**\n` +
    newItems.slice(0, 30).map(i => `- ${i.assignee || '?'} (${i.priority || '?'}): ${i.item_text}`).join('\n') +
    `\n\n**Currently overdue (${overdue.length}):**\n` +
    overdue.slice(0, 15).map(i => `- ${i.assignee || '?'}: ${i.item_text} (due ${i.due_date})`).join('\n') +
    `\n\n**New cross-project insights (${insights.length}):**\n` +
    insights.map(i => `- [${i.severity}] ${i.title} → ${i.recommended_action || ''}`).join('\n') +
    `\n\n**Meetings this week (${meetings.length} unique):**\n` +
    meetings.slice(0, 15).map(m => `- ${m.project}: ${m.ref}`).join('\n') +
    `\n\n**Top projects by activity:**\n` +
    Object.entries(projectActivity.byProject).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([p,n]) => `- ${p}: ${n} chunks`).join('\n') +
    `\n\n**New BNI contacts updated (${bniNew.length}):**\n` +
    bniNew.slice(0, 10).map(c => `- ${c.first} ${c.last||''} (${c.segment||'?'}) — ${c.company||'no co'} ${c.status}`).join('\n');

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: sys,
    messages: [{ role: 'user', content: data }],
  });
  return res.content[0].text;
}

async function run() {
  const week = isoWeek();
  const { weekStart, weekStartDate, weekEndDate } = weekBounds();
  console.log(`Generating weekly review for ${week} (${weekStartDate} to ${weekEndDate})...`);

  const [completed, newItems, overdue, insights, meetings, projectActivity, bniNew] = await Promise.all([
    getCompletedItems(weekStart),
    getNewItems(weekStart),
    getOpenOverdue(),
    getNewInsights(weekStart),
    getRecentMeetings(weekStart),
    getProjectActivity(weekStart),
    getNewBniContacts(weekStart),
  ]);

  console.log(`Data: ${completed.length} completed, ${newItems.length} new items, ${overdue.length} overdue, ${insights.length} insights, ${meetings.length} meetings, ${bniNew.length} BNI updates`);

  const narrative = await aiNarrative({ completed, newItems, overdue, insights, meetings, projectActivity, bniNew });

  const fm = [
    '---',
    `week: ${week}`,
    `period: ${weekStartDate} to ${weekEndDate}`,
    `type: weekly-review`,
    `generated_at: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');

  const body = [
    `# 📊 Weekly Review — ${week}`,
    '',
    `_Period: ${weekStartDate} to ${weekEndDate}_`,
    '',
    narrative,
    '',
    '---',
    '',
    `## Raw stats`,
    `- Completed items: **${completed.length}**`,
    `- New items: **${newItems.length}**`,
    `- Open overdue: **${overdue.length}**`,
    `- Insights detected: **${insights.length}**`,
    `- Meetings ingested: **${meetings.length}**`,
    `- New BNI contacts updated: **${bniNew.length}**`,
    `- Top project: **${Object.entries(projectActivity.byProject).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'none'}**`,
    '',
    '---',
    '',
    '*Generated by `brain:weekly-review` every Sunday 08:00 IST. Past reviews: see `_Weekly-Reviews/` folder.*',
  ].join('\n');

  const dir = join(VAULT_ROOT, '_Weekly-Reviews');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${week}.md`);
  await writeFile(filePath, fm + body);
  console.log(`✓ Wrote ${filePath}`);

  // Slack DM with the narrative
  if (slack && process.env.SLACK_MURALI_USER_ID && !DRY) {
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `📊 *Weekly Review — ${week}*\n\n${narrative}\n\n_Full review in vault: \`_Weekly-Reviews/${week}.md\`_`,
    });
    console.log('✓ Posted to Slack DM.');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
