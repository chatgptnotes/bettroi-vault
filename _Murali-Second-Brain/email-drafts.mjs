// email-drafts.mjs — for important emails captured by email-sync, generate
// AI-drafted replies using brain context. Saves to _Email-Drafts/ for review.
// Usage: node --env-file=.env.local _Murali-Second-Brain/email-drafts.mjs [--limit N]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Email-Drafts');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '20', 10);
const DRY = process.argv.includes('--dry');

async function brainContext(subject, from) {
  const { queryBrain } = await import('./query.mjs');
  try {
    const { answer } = await queryBrain({
      question: `Context for replying to an email from ${from} about "${subject}". Summarize relevant prior history, open commitments, decisions, and what the sender most likely needs.`,
      role: 'murali',
    });
    return answer;
  } catch { return ''; }
}

async function generateDraft({ subject, from, body, context }) {
  const sys = `You are drafting an email reply for Dr. Murali (hospital owner + AI consulting CEO).

Tone: Direct, warm, professional. NO fluff. NO "I hope this email finds you well". Mirror Murali's natural style — concise, decisive, with specifics.

Use the brain context to:
- Reference past decisions/numbers when relevant
- Address explicit commitments mentioned in the incoming email
- Propose concrete next steps with dates if appropriate

Output ONLY the email body (no Subject:, no greeting "Dear X", no signature block).
Start with first name greeting ("Hi <First>,") and end with "—\\nMurali".

Length: 80-180 words ideally. Match the incoming email's length where possible.`;

  const user = `INCOMING EMAIL
From: ${from}
Subject: ${subject}

${(body || '').slice(0, 3000)}

---

BRAIN CONTEXT (use if relevant):
${context || '_(no prior context found)_'}

---

Draft reply:`;

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  return res.content[0].text.trim();
}

function safeSlug(s) {
  return (s || 'untitled').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function run() {
  // Find captured emails from last 7 days that need a reply (importance >= 0.8)
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: emails } = await supabase.from('brain_chunks')
    .select('content, source_ref, metadata, created_at')
    .eq('source_type', 'email').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(LIMIT);

  if (!emails?.length) { console.log('No recent emails to draft replies for.'); return; }

  // Dedupe by source_ref (one email = one draft)
  const seen = new Set();
  const queue = [];
  for (const e of emails) {
    if (seen.has(e.source_ref)) continue;
    seen.add(e.source_ref);
    const importance = e.metadata?.importance ?? 0;
    if (importance < 0.8) continue;
    queue.push(e);
  }
  console.log(`Drafting ${queue.length} replies from ${seen.size} unique emails...`);

  await mkdir(TARGET_DIR, { recursive: true });

  let drafted = 0;
  const summaries = [];
  for (const e of queue) {
    const subject = e.metadata?.subject ?? '(no subject)';
    const from = e.metadata?.from ?? 'unknown';
    const date = e.metadata?.date ?? new Date().toISOString().slice(0, 10);

    console.log(`\n📨 ${from} — ${subject.slice(0, 60)}`);
    const context = await brainContext(subject, from);
    const draft = await generateDraft({ subject, from, body: e.content, context });

    if (DRY) {
      console.log('[DRY] Would write draft:\n' + draft.slice(0, 400));
      drafted++; continue;
    }

    const slug = `${date}-${safeSlug(subject).slice(0, 50)}`;
    const filepath = join(TARGET_DIR, `${slug}.md`);
    const md = [
      '---',
      `date: ${date}`,
      `source: email-draft`,
      `replying_to: ${JSON.stringify(from)}`,
      `subject: ${JSON.stringify(subject)}`,
      `original_ref: ${JSON.stringify(e.source_ref)}`,
      `off_limits: true`,
      '---',
      '',
      `# Draft reply: ${subject}`,
      '',
      `**To:** ${from}`,
      `**Re:** ${subject}`,
      '',
      '## Draft',
      '',
      '```',
      draft,
      '```',
      '',
      '## Context Murali used',
      '',
      context ? '> ' + context.split('\n').join('\n> ') : '_(no context)_',
      '',
      '## Original email',
      '',
      '```',
      (e.content || '').slice(0, 3000),
      '```',
    ].join('\n');
    await writeFile(filepath, md);
    summaries.push({ from, subject, file: filepath });
    drafted++;
  }

  console.log(`\n✓ Wrote ${drafted} draft replies to ${TARGET_DIR}`);

  // Notify Murali in Slack with a digest
  if (slack && process.env.SLACK_MURALI_USER_ID && drafted > 0 && !DRY) {
    const lines = summaries.map((s, i) => `${i+1}. *${s.subject.slice(0, 60)}* — from ${s.from}`);
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `📨 *${drafted} draft email replies ready for review*\n\n${lines.join('\n')}\n\nOpen \`_Email-Drafts/\` in Obsidian, review, copy the draft you want, paste into your email client.`,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
