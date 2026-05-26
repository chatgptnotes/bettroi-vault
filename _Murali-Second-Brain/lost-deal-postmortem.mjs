// lost-deal-postmortem.mjs — monthly: scan brain for closed-lost signals,
// extract loss reasons + competitor patterns + price patterns, write to
// _Marketing/lost-deal-postmortems/YYYY-MM.md
//
// Usage: node --env-file=.env.local _Murali-Second-Brain/lost-deal-postmortem.mjs [--days=90] [--dry]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Marketing', 'lost-deal-postmortems');
const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '90', 10);
const DRY = process.argv.includes('--dry');

// Signal keywords that indicate a deal was lost or went cold
const LOSS_KEYWORDS = [
  'went with', 'chose', 'decided not to', 'not moving forward', 'budget',
  'too expensive', 'cheaper alternative', 'lost the deal', 'lost this',
  'they declined', 'rejected', 'didn\'t close', 'didn\'t go through',
  'closed lost', 'not happening', 'they went elsewhere', 'they picked',
  'we lost', 'no longer interested', 'paused', 'on hold indefinitely',
];

async function findLossSignals() {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const orFilter = LOSS_KEYWORDS.map(k => `content.ilike.%${k}%`).join(',');
  const { data } = await brain.from('brain_chunks')
    .select('id, project_tag, source_type, source_ref, content, created_at, metadata')
    .gte('created_at', since)
    .eq('off_limits', false)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(80);
  return data ?? [];
}

async function clusterAndAnalyze(chunks) {
  if (chunks.length < 3) return null;

  const corpus = chunks.slice(0, 40).map((c, i) =>
    `[#${i+1}] (${c.project_tag} / ${c.source_type} / ${c.created_at.slice(0,10)})\n${c.content.slice(0, 600)}`
  ).join('\n\n---\n\n');

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are a sales-ops analyst at Bettroi (B2B AI software). You're given chunks of conversations, emails, and call recaps that mention deal losses, declines, or stalls.

Produce a deal-loss post-mortem with these sections:

## Deals identified
Numbered list. For each: client/company name, project, what it was about (one line), the source [#N] reference, date if known.

## Loss reasons (clustered)
Cluster the losses by root cause. Possible buckets:
- Price (too expensive, budget mismatch)
- Competitor won
- Stalled / went silent
- Internal change at prospect (team change, priority shift)
- Scope/fit mismatch
- Timing (postponed indefinitely)
- Trust/credibility (specific concerns raised)

For each non-empty bucket: count, 1-2 supporting quotes, named deals.

## Competitor signals
Which competitors are named most often in losses? Who came up multiple times?

## Price points where we lose
List specific price/quote ranges mentioned in losses (e.g. "₹15L for HMS rebuild → went with cheaper option").

## 3 pattern observations
The non-obvious things — e.g. "we lose more in manufacturing than healthcare", "stalls cluster around month-ends", "wins close in 2 weeks, losses drag 8+ weeks".

## Recommended actions
3-5 concrete things to change in pitch / pricing / qualification.

Be specific, name names, quote actual content. Output as clean Markdown.`,
    messages: [{ role: 'user', content: corpus.slice(0, 14000) }],
  });
  return res.content[0].text.trim();
}

function todayUTC() { return new Date().toISOString().slice(0, 10); }
function thisMonth() { return new Date().toISOString().slice(0, 7); }

async function run() {
  console.log(`Scanning last ${DAYS} days for deal-loss signals...`);
  const chunks = await findLossSignals();
  console.log(`Found ${chunks.length} chunk(s) with loss keywords.`);

  if (chunks.length < 3) {
    console.log('Not enough signal — skipping (need 3+ matches).');
    return;
  }

  const analysis = await clusterAndAnalyze(chunks);
  if (!analysis) { console.log('No analysis generated.'); return; }

  await mkdir(TARGET_DIR, { recursive: true });
  const filePath = join(TARGET_DIR, `${thisMonth()}.md`);
  const md = [
    '---',
    `date: ${todayUTC()}`,
    `source: lost-deal-postmortem`,
    `period_days: ${DAYS}`,
    `chunks_analyzed: ${chunks.length}`,
    `off_limits: false`,
    '---',
    '',
    `# Lost-Deal Post-Mortem — ${thisMonth()}`,
    '',
    `*Auto-analysis of ${chunks.length} loss signals from the last ${DAYS} days. Generated ${todayUTC()}.*`,
    '',
    analysis,
    '',
    '---',
    '',
    '## Sources used',
    '',
    ...chunks.slice(0, 20).map((c, i) => `- [#${i+1}] \`${c.project_tag}\` ${c.source_type} (${c.created_at.slice(0,10)}) — ${c.source_ref}`),
  ].join('\n');

  if (DRY) {
    console.log('--- DRY: analysis preview ---\n');
    console.log(analysis.slice(0, 2000));
    return;
  }

  await writeFile(filePath, md);
  console.log(`✓ Wrote ${filePath}`);

  if (slack && process.env.SLACK_MURALI_USER_ID) {
    const summary = analysis.split('\n').filter(l => l.startsWith('## ')).slice(0, 5).join('\n');
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `🔻 *Lost-deal post-mortem for ${thisMonth()}* — ${chunks.length} loss signals analyzed.\n\nSections covered:\n${summary}\n\nOpen \`_Marketing/lost-deal-postmortems/${thisMonth()}.md\` for details.`,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
