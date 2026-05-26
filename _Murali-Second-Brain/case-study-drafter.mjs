// case-study-drafter.mjs — for projects in known-active state, draft a case-study
// from Fathom + Obsidian + brain_chunks. One per project, written to
// _Marketing/case-studies/_drafts/{project}-{date}.md
//
// Triggers on:
//   1. Closed-won signals in brain_chunks (after S1/HubSpot is wired, can read from there)
//   2. Manual project list passed via --projects=Bajaj,Adamrit
//
// Usage: node --env-file=.env.local _Murali-Second-Brain/case-study-drafter.mjs [--projects=...] [--days=180] [--dry]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Marketing', 'case-studies', '_drafts');
const STATE_KEY  = 'U_CASE_STUDY_DRAFTED';

const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '180', 10);
const MANUAL = (process.argv.find(a => a.startsWith('--projects='))?.split('=')[1] ?? '').split(',').filter(Boolean);
const DRY = process.argv.includes('--dry');

const WIN_KEYWORDS = [
  'closed won', 'closed-won', 'deal closed', 'signed agreement', 'project kicked off',
  'launched', 'went live', 'rolled out', 'in production', 'shipped to client',
  'first invoice', 'milestone delivered', 'gone live', 'live in production',
];

// Meta-folders that aren't real client projects — exclude from case-study candidates
const META_PROJECTS = new Set([
  'proposals', 'vault-root', '_inbox', '_email-inbox', '_calendar', '_daily-briefs',
  '_weekly-reviews', 'clippings', 'corpus', '_fathom-inbox', '_email-drafts',
  '_marketing', '_brain-onboarding', 'decisions', 'glossary', 'scripts', 'agents',
  'supabase', '_murali-second-brain',
]);

async function getState() {
  const { data } = await brain.from('brain_user_state').select('last_items_dm').eq('slack_user_id', STATE_KEY).maybeSingle();
  return new Set((data?.last_items_dm ?? []).map(String));
}
async function saveState(set) {
  await brain.from('brain_user_state').upsert({
    slack_user_id: STATE_KEY, last_items_dm: [...set].slice(-500).map(String), updated_at: new Date().toISOString(),
  }, { onConflict: 'slack_user_id' });
}

async function findCandidateProjects() {
  if (MANUAL.length) return MANUAL;
  // Heuristic — projects with >=20 chunks AND a win-signal keyword in the last DAYS
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const orFilter = WIN_KEYWORDS.map(k => `content.ilike.%${k}%`).join(',');
  const { data } = await brain.from('brain_chunks')
    .select('project_tag').gte('created_at', since).eq('off_limits', false).or(orFilter).limit(500);
  const counts = {};
  for (const r of (data ?? [])) counts[r.project_tag] = (counts[r.project_tag] || 0) + 1;
  return Object.entries(counts)
    .filter(([p, n]) => n >= 2 && !META_PROJECTS.has(p.toLowerCase()))
    .map(([p]) => p).slice(0, 6);
}

async function gatherProjectContext(project) {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const { data } = await brain.from('brain_chunks')
    .select('source_type, source_ref, content, created_at, metadata')
    .eq('project_tag', project).eq('off_limits', false).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(40);
  return data ?? [];
}

async function draftCaseStudy({ project, chunks }) {
  const corpus = chunks.slice(0, 30).map((c, i) =>
    `[#${i+1}] (${c.source_type} / ${c.created_at.slice(0,10)})\n${c.content.slice(0, 700)}`
  ).join('\n\n---\n\n');

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 3500,
    system: `You write 1-page B2B case studies for Bettroi (B2B AI software studio).

Bettroi's voice: direct, specific, hospital/operator credibility. Hates fluff. Concrete numbers when available. Indian English natural.

A great Bettroi case study has:
1. **Headline** — what was achieved in numbers ("Cut admission discharge time from 90 min to 18 min")
2. **The problem** — 2-3 sentences. Specific friction the client faced.
3. **What we built** — 4-6 bullets. Technical specifics + business outcome.
4. **The result** — measurable outcomes (time saved, errors avoided, cost reduced, throughput improved). If not stated in sources, make a soft claim ("reduced manual entry significantly") rather than fake a number.
5. **Murali's note** — one sentence in first-person about the most non-obvious thing that made it work.
6. **Stack** — comma-separated list of tools/frameworks used

DO NOT:
- Use cliches ("transformed", "revolutionized", "cutting-edge")
- Make up specific metrics
- Name the client by anything more identifying than what's in the source material
- Use marketing-speak ("seamless", "synergy", "scalable solution")

Output: clean Markdown. Save the headline as H1, sections as H2.`,
    messages: [{ role: 'user', content: `PROJECT: ${project}\n\nSource chunks from the brain:\n\n${corpus.slice(0, 14000)}` }],
  });
  return res.content[0].text.trim();
}

function todayUTC() { return new Date().toISOString().slice(0, 10); }
function safeSlug(s) { return (s || 'project').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 50); }

async function run() {
  const projects = await findCandidateProjects();
  console.log(`Candidate projects: ${projects.join(', ') || '(none)'}`);
  if (!projects.length) return;

  await mkdir(TARGET_DIR, { recursive: true });
  const state = await getState();
  const written = [];

  for (const project of projects) {
    const key = `${project}-${new Date().toISOString().slice(0,7)}`;
    if (state.has(key)) { console.log(`  ⊘ ${project} — drafted this month, skipping`); continue; }

    console.log(`\n📑 ${project}`);
    const chunks = await gatherProjectContext(project);
    if (chunks.length < 5) { console.log(`  ⚠ only ${chunks.length} chunks — skipping`); continue; }

    console.log(`  • ${chunks.length} chunks loaded`);
    const body = await draftCaseStudy({ project, chunks });
    const headline = (body.match(/^#\s+(.+)$/m)?.[1] ?? `Case study: ${project}`).slice(0, 150);
    const filePath = join(TARGET_DIR, `${todayUTC()}-${safeSlug(project)}.md`);

    const md = [
      '---',
      `date: ${todayUTC()}`,
      `source: case-study-drafter`,
      `project: ${JSON.stringify(project)}`,
      `chunks_used: ${chunks.length}`,
      `status: draft`,
      `off_limits: false`,
      '---',
      '',
      body,
    ].join('\n');

    if (DRY) { console.log(`  [DRY] would write headline: ${headline}\n${body.slice(0,400)}...`); state.add(key); continue; }

    await writeFile(filePath, md);
    console.log(`  ✓ Wrote ${filePath}`);
    state.add(key);
    written.push({ project, file: filePath, headline });
  }

  if (!DRY) await saveState(state);
  console.log(`\n✓ ${written.length} case-study draft(s)`);

  if (slack && process.env.SLACK_MURALI_USER_ID && written.length && !DRY) {
    const lines = written.map((w, i) => `${i+1}. *${w.headline}* — \`${w.project}\``);
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `📑 *${written.length} case-study draft${written.length===1?'':'s'} ready for review*\n\n${lines.join('\n')}\n\nOpen \`_Marketing/case-studies/_drafts/\` in Obsidian.`,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
