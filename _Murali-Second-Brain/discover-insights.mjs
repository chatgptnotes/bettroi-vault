// discover-insights.mjs — find cross-project patterns, contradictions, reuse opportunities
// Usage: node --env-file=.env.local _Murali-Second-Brain/discover-insights.mjs [--days N] [--dry]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '14', 10);
const DRY = process.argv.includes('--dry');

const SKIP_PROJECTS = new Set(['_inbox', 'vault-root', 'clippings', 'agents', 'corpus', 'glossary', 'decisions']);

async function gatherCorpus() {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();

  // Recent meeting summaries + diary entries (the rich content)
  const { data: chunks } = await supabase
    .from('brain_chunks')
    .select('project_tag, content, source_ref, metadata, created_at')
    .gte('created_at', since)
    .eq('off_limits', false)
    .or('source_ref.like.%/meetings/%,source_ref.like.%/diary/%');

  // Recent action items (decisions/commitments)
  const { data: items } = await supabase
    .from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, meeting_date, priority')
    .gte('created_at', since)
    .eq('status', 'open');

  // Group chunks per project so we don't blow context with raw chunks
  const perProject = {};
  for (const c of chunks ?? []) {
    if (SKIP_PROJECTS.has(c.project_tag)) continue;
    if (!perProject[c.project_tag]) perProject[c.project_tag] = [];
    perProject[c.project_tag].push({
      date: c.metadata?.date?.slice(0, 10) ?? c.created_at.slice(0, 10),
      ref: c.source_ref,
      snippet: c.content.slice(0, 600),
    });
  }
  return { perProject, items: items ?? [] };
}

function buildPrompt({ perProject, items }) {
  const projectBlocks = Object.entries(perProject).map(([proj, entries]) => {
    const sorted = entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4); // 4 most recent per project
    return `### PROJECT: ${proj}\n\n` + sorted.map(e => `*${e.date}* (${e.ref})\n${e.snippet}\n`).join('\n---\n');
  }).join('\n\n');

  const itemsBlock = items.slice(0, 80).map(i =>
    `[${i.project_tag}] (${i.priority || '?'}) ${i.assignee ? '*'+i.assignee+'*: ' : ''}${i.item_text}${i.due_date ? ' due '+i.due_date : ''}`
  ).join('\n');

  return `You are analyzing Murali's project portfolio for the last ${DAYS} days, looking for HIGH-VALUE insights he might miss.

Find AT MOST 8 insights of these types:

1. **recurring** — Same problem/objection/decision appearing across 2+ projects. Surface the common pattern + how each was resolved.
2. **contradiction** — Two decisions or commitments that conflict. Example: "Quoted 7,000 for X on day A, then 5,000 on day B". Surface what changed and which is current.
3. **reuse** — Solution applied to project A would help project B (Murali may not have realized).
4. **risk** — Slipping commitment, blocked dependency, vendor issue that touches multiple projects.
5. **pattern** — Notable insight about the portfolio (e.g. "5 projects in NeuroQ family — consider consolidation").

For each insight, emit:
- "title": 8-12 words, factual, no fluff
- "description": 2-3 sentences explaining what + why it matters
- "insight_type": one of recurring | contradiction | reuse | risk | pattern
- "severity": high | medium | low | info
- "projects": array of project tags involved
- "evidence": array of {project, date, quote} — concrete citations from the corpus below (max 4 per insight)
- "recommended_action": 1 sentence — what Murali should do

Output ONLY a JSON array (no preamble):
[{...}, {...}, ...]

If no notable insights found, output: []

=== PROJECT ACTIVITY (last ${DAYS} days) ===

${projectBlocks}

=== OPEN ACTION ITEMS ===

${itemsBlock}`;
}

async function detect(corpus) {
  const prompt = buildPrompt(corpus);
  console.log(`Sending ${prompt.length.toLocaleString()} chars to Claude Sonnet...`);

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content[0].text.trim();
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) {
    console.warn('No JSON array in response.');
    console.log(text.slice(0, 500));
    return [];
  }
  try {
    return JSON.parse(m[0]);
  } catch (e) {
    console.warn('JSON parse failed:', e.message);
    return [];
  }
}

async function persist(insights) {
  if (!insights.length) return [];
  const rows = insights.map(i => ({
    insight_type: i.insight_type,
    title: i.title.slice(0, 200),
    description: i.description,
    evidence: i.evidence ?? [],
    projects: i.projects ?? [],
    severity: i.severity ?? 'info',
    recommended_action: i.recommended_action,
  }));
  const { data, error } = await supabase
    .from('brain_insights')
    .upsert(rows, { onConflict: 'insight_type,title', ignoreDuplicates: false })
    .select();
  if (error) {
    console.error('Insert failed:', error.message);
    return [];
  }
  return data;
}

function formatForSlack(insights) {
  const ICON = { recurring: '🔁', contradiction: '⚠️', reuse: '♻️', risk: '🚨', pattern: '🧭' };
  const SEV  = { high: '🔴', medium: '🟠', low: '🟡', info: '🔵' };
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🧭 Cross-Project Insights — last ${DAYS} days` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Found *${insights.length}* insight${insights.length === 1 ? '' : 's'} across your portfolio` }] },
    { type: 'divider' },
  ];
  for (const ins of insights) {
    const icon = ICON[ins.insight_type] ?? '💡';
    const sev = SEV[ins.severity] ?? '⚪';
    const projects = (ins.projects ?? []).map(p => `\`${p}\``).join(' · ');
    const evidence = (ins.evidence ?? []).slice(0, 3).map(e =>
      `  └ _${e.project ?? '?'}_ ${e.date ?? ''}: "${(e.quote ?? '').slice(0, 200)}"`
    ).join('\n');
    const text = `${icon} ${sev} *${ins.title}*  _(${ins.insight_type})_\n${ins.description}\n\n*Projects:* ${projects}\n${evidence ? '*Evidence:*\n' + evidence : ''}\n${ins.recommended_action ? '\n→ *Action:* ' + ins.recommended_action : ''}`;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } }, { type: 'divider' });
  }
  return blocks;
}

async function run() {
  console.log(`Discovering cross-project insights (last ${DAYS} days)...`);
  const corpus = await gatherCorpus();
  console.log(`Corpus: ${Object.keys(corpus.perProject).length} projects, ${corpus.items.length} open action items`);

  const insights = await detect(corpus);
  console.log(`Detected ${insights.length} insight(s).\n`);
  for (const i of insights) {
    console.log(`[${i.severity}] ${i.insight_type}: ${i.title}`);
    console.log(`  → ${i.recommended_action ?? '(no action)'}`);
  }

  if (!DRY) {
    const saved = await persist(insights);
    console.log(`\n✓ Persisted ${saved.length} insights to brain_insights.`);
  }

  // Post to Slack DM
  if (!DRY && slack && insights.length && process.env.SLACK_MURALI_USER_ID) {
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `🧭 ${insights.length} cross-project insight(s) detected`,
      blocks: formatForSlack(insights),
    });
    console.log('✓ Posted to Slack DM.');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
