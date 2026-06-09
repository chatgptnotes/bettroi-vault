// strategy-advisor.mjs — the "General": a goal-aligned focus brief.
// Reads _Strategy/{Goals,Vision,Priorities}.md from disk + recent brain activity, then tells Murali
// what to push and what to drop THIS WEEK relative to his stated goals (not just what happened).
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/strategy-advisor.mjs        # write file + Slack DM
//   node --env-file=.env.local _Murali-Second-Brain/strategy-advisor.mjs --dry  # print only
//
// Exports buildFocus(role) for the `@brain focus` Slack intent (owner-only).

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import { callClaude } from './ai-client.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;
const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');

const SKIP_PROJECTS = new Set(['_inbox', 'vault-root', 'clippings', 'agents', 'corpus', 'glossary', 'decisions', 'bettroi-vault-main', 'modules', 'services']);

async function readStrategy() {
  const out = {};
  for (const f of ['Goals.md', 'Vision.md', 'Priorities.md']) {
    try { out[f] = await readFile(join(VAULT_ROOT, '_Strategy', f), 'utf8'); }
    catch { out[f] = '(not found)'; }
  }
  return out;
}

// Project activity in the last `days` days (paginated — PostgREST caps select at 1000 rows).
async function projectActivity(since) {
  const counts = {};
  for (let from = 0; ; from += 1000) {
    const { data } = await brain.from('brain_chunks')
      .select('project_tag').eq('off_limits', false).gte('created_at', since).range(from, from + 999);
    if (!data?.length) break;
    for (const r of data) {
      if (!r.project_tag.startsWith('_') && !SKIP_PROJECTS.has(r.project_tag)) {
        counts[r.project_tag] = (counts[r.project_tag] || 0) + 1;
      }
    }
    if (data.length < 1000) break;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

async function gather() {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [strategy, activity, openItems, overdue, insights] = await Promise.all([
    readStrategy(),
    projectActivity(since),
    brain.from('brain_action_items').select('item_text, assignee, project_tag, priority, due_date')
      .eq('status', 'open').order('due_date', { ascending: true, nullsFirst: false }).limit(40).then(r => r.data ?? []),
    brain.from('brain_action_items').select('item_text, assignee, project_tag, due_date')
      .eq('status', 'open').not('due_date', 'is', null).lte('due_date', today).limit(20).then(r => r.data ?? []),
    brain.from('brain_insights').select('insight_type, title, severity, recommended_action, projects')
      .gte('detected_at', since).order('severity').limit(15).then(r => r.data ?? []),
  ]);

  return { strategy, activity, openItems, overdue, insights };
}

function buildPrompt({ strategy, activity, openItems, overdue, insights }) {
  const sys = `You are Murali's chief of staff. Murali is a hospital owner (Hope Hospital) and AI-consulting CEO (Bettroi/HopeTech).
Your job is STRATEGIC, not tactical: given his stated goals, tell him what to actually focus on this week and what to stop doing.

Use his goals/vision/priorities as the FRAME. Be candid and specific — name real projects and people. No fluff, no hedging.

Output markdown with exactly these sections:

## 🎯 Top 3 this week
The 3 things most worth his personal time this week, each tied to a stated goal. One line each + why.

## ✋ Drop / delegate
2-4 things eating time that he should stop, delegate, or defer — especially work not tied to any stated goal.

## ⚠️ Goal drift
Projects with heavy recent activity that don't map to any stated goal (possible time sinks), AND stated goals with little/no recent activity (stalled). Be concrete with the numbers.

## 🔭 One bigger question
A single strategic question he should sit with this week.

Keep it under 350 words total. If his goals are empty/placeholder, say so plainly and tell him to fill in _Strategy/Goals.md first, then give best-effort advice from activity alone.`;

  const data = `=== HIS STATED STRATEGY ===

# Goals.md
${strategy['Goals.md']}

# Vision.md
${strategy['Vision.md']}

# Priorities.md
${strategy['Priorities.md']}

=== RECENT ACTIVITY (last 14 days) ===

Project activity (chunks ingested = rough attention proxy):
${activity.slice(0, 20).map(([p, n]) => `- ${p}: ${n}`).join('\n') || '(none)'}

Open action items (${openItems.length}):
${openItems.slice(0, 25).map(i => `- [${i.project_tag}] ${i.assignee || '?'} (${i.priority || '?'}${i.due_date ? ', due ' + i.due_date : ''}): ${i.item_text}`).join('\n') || '(none)'}

Overdue (${overdue.length}):
${overdue.map(i => `- [${i.project_tag}] ${i.assignee || '?'}: ${i.item_text} (due ${i.due_date})`).join('\n') || '(none)'}

Recent cross-project insights (${insights.length}):
${insights.map(i => `- [${i.severity}] ${i.title}${i.recommended_action ? ' → ' + i.recommended_action : ''}`).join('\n') || '(none)'}`;

  return { sys, data };
}

// Core: returns the focus-brief markdown. Used by run() and the @brain focus Slack intent.
export async function buildFocus() {
  const corpus = await gather();
  const { sys, data } = buildPrompt(corpus);
  const res = await callClaude({ model: 'claude-sonnet-4-6', max_tokens: 1600, system: sys, messages: [{ role: 'user', content: data }] });
  return res.content[0].text.trim();
}

async function run() {
  console.log('Generating strategic focus brief...');
  const brief = await buildFocus();
  const date = new Date().toISOString().slice(0, 10);

  if (DRY) { console.log('\n' + brief); return; }

  const dir = join(VAULT_ROOT, '_Strategy');
  await mkdir(dir, { recursive: true });
  const fm = `---\ntype: focus-brief\ngenerated_at: ${new Date().toISOString()}\n---\n\n`;
  await writeFile(join(dir, `Focus-${date}.md`), fm + `# 🧭 Focus — ${date}\n\n` + brief + '\n');
  console.log(`✓ Wrote _Strategy/Focus-${date}.md`);

  if (slack && process.env.SLACK_MURALI_USER_ID) {
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({ channel: open.channel.id, text: `🧭 *Strategic Focus — ${date}*\n\n${brief}\n\n_Full brief: \`_Strategy/Focus-${date}.md\`. Update goals in \`_Strategy/Goals.md\` anytime._` });
    console.log('✓ Posted to Slack DM.');
  }
}

// Only run the scheduled job when invoked directly (not when imported by slack-bot for buildFocus).
if (process.argv[1] && process.argv[1].endsWith('strategy-advisor.mjs')) {
  run().catch(e => { console.error(e); process.exit(1); });
}
