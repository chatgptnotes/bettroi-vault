// linkedin-drafter.mjs — daily, scan last 48h of brain content, draft 3 LinkedIn posts
// in Murali's voice, deliver to #review-content Slack channel (or DM fallback).
// Usage: node --env-file=.env.local _Murali-Second-Brain/linkedin-drafter.mjs [--dry]
//
// Output: _Marketing/linkedin-drafts/YYYY-MM-DD.md + Slack post
// Schedule: daily 18:00 IST via brain-linkedin-drafter.yml

import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import { callClaude } from './ai-client.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Marketing', 'linkedin-drafts');
const DRY = process.argv.includes('--dry');
const HOURS = parseInt(process.argv.find(a => a.startsWith('--hours='))?.split('=')[1] ?? '48', 10);

function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

async function findRichContent() {
  // Last N hours of content, exclude off_limits, prefer fathom/diary/insights (higher signal)
  const since = new Date(Date.now() - HOURS * 3600000).toISOString();
  const { data } = await supabase.from('brain_chunks')
    .select('project_tag, source_type, source_ref, content, created_at, metadata')
    .gte('created_at', since)
    .eq('off_limits', false)
    .in('source_type', ['fathom', 'diary', 'obsidian', 'insight', 'slack-thread'])
    .order('created_at', { ascending: false })
    .limit(60);
  return data ?? [];
}

async function pickPostableMoments(chunks) {
  if (!chunks.length) return [];
  const corpus = chunks.map((c, i) =>
    `[#${i+1}] (${c.source_type}/${c.project_tag}) ${c.content.slice(0, 400)}`
  ).join('\n\n');

  const sys = `You scan a B2B founder's knowledge base for moments worth turning into LinkedIn posts.

A "postable moment" is:
- A specific decision with a non-obvious reason
- A counterintuitive learning ("we thought X, turned out Y")
- A concrete win with a measurable outcome ("cut X from 30 days to 2 hours")
- An industry observation backed by recent firsthand data
- A friction point a buyer/founder/operator would nod at

NOT postable:
- Status updates ("we're still working on Adamrit")
- Vague generalities ("AI is transforming healthcare")
- Internal HR/finance/team management
- Anything that names a client without their consent

Pick the 3 BEST distinct moments. For each return:
- "hook_idea": the angle (one sentence)
- "evidence_id": [#N] reference from corpus that backs this
- "angle": one of "anecdote" | "contrarian" | "framework" | "data-point"

Output ONLY JSON array of 3 objects, no commentary.`;

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: sys,
    messages: [{ role: 'user', content: corpus.slice(0, 12000) }],
  });
  const m = res.content[0].text.match(/\[[\s\S]*\]/);
  return m ? JSON.parse(m[0]) : [];
}

async function draftPost({ moment, chunks }) {
  const ref = parseInt(String(moment.evidence_id ?? '').match(/\d+/)?.[0]) - 1;
  const source = chunks[ref] ?? chunks[0];

  const sys = `You write LinkedIn posts for Dr. Murali — hospital owner (Hope Hospital, Nagpur), founder of Bettroi (B2B AI agency), running the Be AI-First framework. Murali's voice:

- Direct, decisive, sometimes sharp
- Hospital owner who codes — speaks operator language
- Hates vague generalities
- Uses concrete numbers, names of decisions, specific friction points
- Indian English — natural, not overly formal
- NEVER uses LinkedIn cliches: "I'm humbled", "Thoughts?", "Excited to announce", "What a journey"
- Rarely uses emojis (max 1-2, never decorative)
- Short paragraphs (1-2 lines each)
- Length: 700-1300 characters

Structure depends on the angle:
- anecdote: scene → moment of friction → what we changed → result
- contrarian: "everyone says X. We did opposite. Here's why."
- framework: name the rule → 2-3 lines explaining → one-line example
- data-point: number/observation → context → implication

End with a sharp closer — a question, a contrarian aside, or silence (no CTA needed).

Output ONLY the post text. No "Here's a draft:" preamble. No subject. No hashtags unless they're load-bearing.`;

  const user = `ANGLE: ${moment.angle}
HOOK: ${moment.hook_idea}

EVIDENCE FROM BRAIN:
${source.content.slice(0, 2000)}

Project: ${source.project_tag}
Source: ${source.source_type}

Draft the post:`;

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  return res.content[0].text.trim();
}

async function postSlackDigest(drafts, date) {
  if (!slack) return;
  const channel = process.env.SLACK_REVIEW_CONTENT_CHANNEL || process.env.SLACK_MURALI_USER_ID;
  if (!channel) return;

  const target = channel.startsWith('U')
    ? (await slack.conversations.open({ users: channel })).channel.id
    : channel;

  const blocks = [
    `📝 *3 LinkedIn drafts for ${date}* — pick one, edit, ship.\n`,
  ];
  drafts.forEach((d, i) => {
    blocks.push(`*${i+1}. ${d.angle.toUpperCase()} — ${d.hook}*\n\n${d.body}\n\n_Source: ${d.source}_\n${'─'.repeat(40)}`);
  });

  await slack.chat.postMessage({
    channel: target,
    text: blocks.join('\n\n'),
    unfurl_links: false,
  });
}

async function run() {
  const date = todayIST();
  console.log(`Scanning brain content from last ${HOURS}h for LinkedIn-worthy moments...`);
  const chunks = await findRichContent();
  console.log(`Found ${chunks.length} chunk(s) to consider.`);

  if (chunks.length < 3) {
    console.log('Not enough material — skipping.');
    return;
  }

  const moments = await pickPostableMoments(chunks);
  console.log(`Picked ${moments.length} postable moments.`);
  if (!moments.length) return;

  const drafts = [];
  for (const moment of moments) {
    console.log(`  → drafting ${moment.angle}: ${moment.hook_idea.slice(0, 60)}`);
    const body = await draftPost({ moment, chunks });
    const ref = parseInt(String(moment.evidence_id ?? '').match(/\d+/)?.[0]) - 1;
    const source = chunks[ref] ?? chunks[0];
    drafts.push({
      angle: moment.angle,
      hook: moment.hook_idea,
      body,
      source: `${source.source_type}: ${source.source_ref}`,
    });
  }

  if (DRY) {
    console.log('\n--- DRY: drafts ---\n');
    drafts.forEach((d, i) => console.log(`\n[${i+1}] ${d.angle.toUpperCase()} — ${d.hook}\n\n${d.body}\n\n(source: ${d.source})\n${'='.repeat(60)}`));
    return;
  }

  // Write to vault
  await mkdir(TARGET_DIR, { recursive: true });
  const filePath = join(TARGET_DIR, `${date}.md`);
  const md = [
    '---',
    `date: ${date}`,
    `source: linkedin-drafter`,
    `count: ${drafts.length}`,
    `off_limits: false`,
    '---',
    '',
    `# LinkedIn drafts — ${date}`,
    '',
    `*${drafts.length} drafts generated from the last ${HOURS}h of brain content.*`,
    '',
    ...drafts.flatMap((d, i) => [
      `## ${i+1}. ${d.angle.toUpperCase()} — ${d.hook}`,
      '',
      '```',
      d.body,
      '```',
      '',
      `**Source:** \`${d.source}\``,
      '',
      '---',
      '',
    ]),
  ].join('\n');
  await writeFile(filePath, md);
  console.log(`\n✓ Wrote ${filePath}`);

  await postSlackDigest(drafts, date);
  console.log('✓ Posted to Slack');
}

run().catch(e => { console.error(e); process.exit(1); });
