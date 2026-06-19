// competitor-monitor.mjs — scan brain_chunks for competitor mentions, write intel report
// Usage: node --env-file=.env.local _Murali-Second-Brain/competitor-monitor.mjs [--dry]
//
// Output: _Marketing/competitor-intel.md
// Schedule: weekly cron via brain-competitor-monitor.yml

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const VAULT_PATH = process.env.VAULT_PATH || '/Users/murali/BeBrain/bettroi-vault';
const DRY = process.argv.includes('--dry');

// Competitors grouped by Bettroi product line. Edit this list to refine the watchlist.
const COMPETITORS = {
  'Healthcare / HMS (Adamrit, Hope, DDO)': [
    'Epic', 'Cerner', 'eClinicalWorks', 'Practo', 'Athenahealth', 'Allscripts',
    'Suvarna', 'Insta HMS', 'MediXcel', 'Caretrack', 'Halemind', 'HealthPlix',
    'CliniQ', 'Healcon', 'Lybrate', 'DocVita',
  ],
  'AI dev platforms (2men.co, Be AI-First)': [
    'Lovable', 'Cursor', 'Bolt.new', 'v0.dev', 'Replit', 'Windsurf',
    'CrewAI', 'LangChain', 'AutoGen', 'Pega', 'UiPath', 'Salesforce Einstein',
  ],
  'SCADA / industrial (PLCAutoPilot, nexaproc)': [
    'Ignition', 'Wonderware', 'Rockwell', 'Siemens WinCC', 'AVEVA',
    'GE Proficy', 'iFix', 'Citect', 'Inductive Automation',
  ],
};

function todayUTC() { return new Date().toISOString().slice(0, 10); }

async function findMentions(name) {
  const { data } = await supabase
    .from('brain_chunks')
    .select('id, project_tag, source_type, source_ref, content, created_at')
    .ilike('content', `%${name}%`)
    .eq('off_limits', false)
    .order('created_at', { ascending: false })
    .limit(15);
  return data ?? [];
}

function snippet(text, name, ctx = 120) {
  const idx = text.toLowerCase().indexOf(name.toLowerCase());
  if (idx < 0) return text.slice(0, ctx * 2);
  return text.slice(Math.max(0, idx - ctx), idx + name.length + ctx).replace(/\s+/g, ' ').trim();
}

async function summarizeCompetitor(name, mentions) {
  if (!mentions.length) return null;
  const ctx = mentions.slice(0, 6).map((m, i) =>
    `[${i + 1}] ${m.project_tag} | ${m.source_type} | ${m.created_at.slice(0,10)}\n   "...${snippet(m.content, name)}..."`
  ).join('\n\n');

  const res = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You analyze competitor mentions in a B2B software company's knowledge base.
For each competitor, give:
- "context": one line — in what context is this competitor coming up (deal-loss, comparison, integration, partnership, etc)
- "sentiment": "positive" | "negative" | "neutral" | "mixed" — how is the competitor perceived in our context
- "key_signal": one factual line — the single most useful intel point an account exec would want

Output ONLY JSON: {"context": "<line>", "sentiment": "<value>", "key_signal": "<line>"}`,
    messages: [{ role: 'user', content: `Competitor: ${name}\n\nMentions:\n${ctx}` }],
  });
  const m = res.content[0].text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

function formatReport(grouped, totalMentions) {
  const lines = [
    '---',
    `date: ${todayUTC()}`,
    `source: competitor-monitor`,
    `total_mentions: ${totalMentions}`,
    `off_limits: false`,
    '---',
    '',
    `# Competitor Intel — ${todayUTC()}`,
    '',
    `*Auto-generated from ${totalMentions} mentions across the brain. Refreshed weekly.*`,
    '',
  ];
  for (const [group, items] of Object.entries(grouped)) {
    if (!items.length) continue;
    lines.push(`## ${group}`, '');
    items.sort((a, b) => b.count - a.count);
    for (const c of items) {
      const sentEmoji = { positive: '🟢', negative: '🔴', neutral: '⚪', mixed: '🟡' }[c.summary?.sentiment ?? 'neutral'];
      lines.push(`### ${c.name} — ${c.count} mention${c.count === 1 ? '' : 's'} ${sentEmoji}`);
      if (c.summary?.context)    lines.push(`**Context:** ${c.summary.context}`);
      if (c.summary?.key_signal) lines.push(`**Signal:**  ${c.summary.key_signal}`);
      lines.push('', `*Recent sources:*`);
      for (const m of c.mentions.slice(0, 3)) {
        lines.push(`- \`${m.project_tag}\` ${m.source_type} (${m.created_at.slice(0, 10)}) — ${m.source_ref}`);
      }
      lines.push('');
    }
  }
  lines.push('---', '*See `_Murali-Second-Brain/competitor-monitor.mjs` to edit the watchlist.*');
  return lines.join('\n');
}

async function main() {
  console.log('Scanning brain for competitor mentions...');
  const grouped = {};
  let totalMentions = 0;

  for (const [group, names] of Object.entries(COMPETITORS)) {
    grouped[group] = [];
    for (const name of names) {
      const mentions = await findMentions(name);
      if (!mentions.length) continue;
      totalMentions += mentions.length;
      console.log(`  ${name.padEnd(30)} → ${mentions.length} mention(s)`);
      const summary = await summarizeCompetitor(name, mentions);
      grouped[group].push({ name, count: mentions.length, mentions, summary });
    }
  }

  const report = formatReport(grouped, totalMentions);
  const outPath = join(VAULT_PATH, '_Marketing', 'competitor-intel.md');
  if (DRY) {
    console.log('\n--- DRY RUN — report preview ---\n');
    console.log(report.slice(0, 2000));
  } else {
    await writeFile(outPath, report);
    console.log(`\n✓ Wrote ${outPath} (${totalMentions} total mentions, ${Object.values(grouped).flat().filter(c => c.count).length} active competitors)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
