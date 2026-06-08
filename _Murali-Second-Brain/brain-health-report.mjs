// brain-health-report.mjs — daily Slack DM to Murali summarizing brain health:
// AI engine status, and per-source freshness (newest chunk age + counts). Catches
// silent degradation (a sync that quietly stopped, an engine out of credits) BEFORE
// it bites. Run on the Mac (needs the SSH tunnel to test the VPS fallback).
//
// Usage: node --env-file=.env.local _Murali-Second-Brain/brain-health-report.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const openai = (await import('openai')).default;
const DRY = process.argv.includes('--dry');
const NOW = Date.now();

// staleDays: warn if the newest chunk is older than this. null = event-driven (don't warn).
const SOURCES = [
  { type: 'obsidian',        label: 'Obsidian vault',    staleDays: 2 },
  { type: 'fathom',          label: 'Fathom meetings',   staleDays: 3 },
  { type: 'email',           label: 'Email',             staleDays: 3 },
  { type: 'pulseofproject',  label: 'Pulse of Project',  staleDays: 2 },
  { type: 'slack',           label: 'Slack messages',    staleDays: null },
  { type: 'slack-file',      label: 'Slack files',       staleDays: null },
  { type: 'gdoc',            label: 'Google Docs',       staleDays: null },
  { type: 'whatsapp',        label: 'WhatsApp',          staleDays: null },
  { type: 'diary',           label: 'Diary (OCR)',       staleDays: null },
];

function ago(ts) {
  if (!ts) return 'never';
  const h = (NOW - new Date(ts).getTime()) / 3.6e6;
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

async function checkEngines() {
  const out = {};
  try {
    const { anthropic } = await import('./ai-client.mjs');
    await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
    out.anthropic = '🟢 ok';
  } catch (e) {
    out.anthropic = /credit|balance|insufficient|quota|billing/i.test(e.message || '') ? '🔴 out of credits' : `🔴 ${(e.message || '').slice(0, 40)}`;
  }
  try {
    const r = await fetch(process.env.NEXAPROC_VPS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nexaproc-Key': process.env.NEXAPROC_VPS_KEY || '' }, body: '{}', signal: AbortSignal.timeout(8000) });
    out.vps = r.status > 0 ? '🟢 reachable (tunnel up)' : '🔴 unreachable';
  } catch { out.vps = '🔴 unreachable (tunnel down?)'; }
  try {
    const oa = new openai({ apiKey: process.env.OPENAI_API_KEY });
    await oa.embeddings.create({ model: 'text-embedding-3-small', input: 'ping' });
    out.openai = '🟢 ok';
  } catch (e) { out.openai = `🔴 ${(e.message || '').slice(0, 40)}`; }
  return out;
}

async function run() {
  const engines = await checkEngines();

  const lines = [];
  let warnings = 0;
  for (const s of SOURCES) {
    const cnt = await supabase.from('brain_chunks').select('*', { count: 'exact', head: true }).eq('source_type', s.type);
    const newest = await supabase.from('brain_chunks').select('created_at').eq('source_type', s.type).order('created_at', { ascending: false }).limit(1);
    const count = cnt.count ?? 0;
    const last = newest.data?.[0]?.created_at;
    const stale = s.staleDays != null && (!last || (NOW - new Date(last).getTime()) / 8.64e7 > s.staleDays);
    if (stale) warnings++;
    const flag = stale ? '⚠️' : (count ? '✓' : '·');
    lines.push(`${flag} *${s.label}* — ${count} chunks, newest ${ago(last)}`);
  }

  // VPS Claude Code subscription is the primary text brain; the API is backup — so
  // API-out-of-credits is informational, not critical. Critical = no LLM at all, or
  // no embeddings (which blocks all ingestion).
  const textBrainOk = engines.vps.startsWith('🟢') || engines.anthropic.startsWith('🟢');
  const embeddingsOk = engines.openai.startsWith('🟢');
  const verdict = !textBrainOk
    ? '🔴 *Brain DOWN* — no working LLM (subscription + API both unreachable)'
    : !embeddingsOk
    ? '🔴 *Ingestion DOWN* — embeddings (OpenAI) unreachable'
    : warnings
    ? `⚠️ *Mostly healthy* — ${warnings} stale source(s)`
    : `🟢 *Brain healthy* — running on ${engines.vps.startsWith('🟢') ? 'Claude Code subscription (VPS)' : 'Anthropic API'}`;

  const text = [
    `🧠 *Second Brain — daily health*`,
    verdict,
    ``,
    `*Engines:*`,
    `• Text brain — Claude Code subscription (VPS): ${engines.vps}`,
    `• Backup — Anthropic API: ${engines.anthropic}`,
    `• Embeddings — OpenAI: ${engines.openai}`,
    ``,
    `*Sources:*`,
    ...lines,
  ].join('\n');

  if (DRY) { console.log(text); return; }
  const muraliId = process.env.SLACK_MURALI_USER_ID;
  if (!muraliId) { console.error('SLACK_MURALI_USER_ID not set'); return; }
  const open = await slack.conversations.open({ users: muraliId });
  await slack.chat.postMessage({ channel: open.channel.id, text });
  console.log(`Health report sent. ${warnings} warning(s), engine issue: ${engineDown}`);
}

run().catch(e => { console.error(e); process.exit(1); });
