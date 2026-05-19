// programmatic-seo-generator.mjs — generate one landing page per (vertical × use-case)
// combination, anchored in Be AI-First framework + brain evidence.
// Output: _Marketing/seo-pages/{vertical}-{usecase}.md (frontmatter ready for any static gen)
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/programmatic-seo-generator.mjs
//   node --env-file=.env.local _Murali-Second-Brain/programmatic-seo-generator.mjs --max=10 --dry
//   node --env-file=.env.local _Murali-Second-Brain/programmatic-seo-generator.mjs --verticals=hospitals,manufacturing

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, '_Marketing', 'seo-pages');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const MAX = parseInt(args.max ?? '999');
const DRY = !!args.dry;

// ── The combinatorial matrix ─────────────────────────────────────────────────

const VERTICALS = (args.verticals?.split(',')) ?? [
  'hospitals', 'multi-specialty-clinics', 'dental-chains',
  'cement-plants', 'power-plants', 'manufacturing-plants', 'oil-and-gas',
  'media-companies', 'government-ministries', 'logistics-companies',
  'pharma-companies', 'medical-device-makers',
];

const USE_CASES = (args.usecases?.split(',')) ?? [
  'ai-agents',
  'workflow-automation',
  'document-ai',
  'predictive-analytics',
  'scada-integration',
  'compliance-automation',
  'crm-automation',
  'whatsapp-automation',
  'hms-modernization',
];

// ── Be AI-First framework anchor ────────────────────────────────────────────

const BE_AI_FIRST_FRAMEWORK = `
The Be AI-First Framework (Bettroi / HopeTech) — 5 stages:
1. Discovery — 2-week audit of current workflows, identifies the 3 highest-ROI AI candidates.
2. Learn — pilot AI agents on one workflow, measure baseline vs AI for 30 days.
3. Wire — integrate winning agents into core systems (HMS, CRM, SCADA, etc.).
4. Automate — replace manual handoffs with agent orchestration.
5. Scale — roll out across teams/sites with monitoring and governance.

Engagement packages (typical):
- Discovery only: 2 weeks, fixed-fee
- Pilot (Discovery + Learn): 6 weeks, fixed-fee
- Full transformation (all 5 stages): 12 weeks, milestone-billed
- Retained ongoing AI operations: monthly subscription`;

// ── Brain evidence per (vertical, use_case) ────────────────────────────────

async function gatherEvidence(vertical, useCase) {
  // Pull a handful of relevant chunks for grounded copy
  const q = `${vertical.replace(/-/g, ' ')} ${useCase.replace(/-/g, ' ')}`;
  const { data } = await brain.from('brain_chunks')
    .select('project_tag, source_type, content, metadata, created_at')
    .ilike('content', `%${vertical.split('-').pop().toLowerCase()}%`)
    .eq('off_limits', false)
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

// ── Page generator ──────────────────────────────────────────────────────────

async function generatePage({ vertical, useCase, evidence }) {
  const evidenceText = evidence.slice(0, 5).map((c, i) =>
    `[#${i+1}] (${c.project_tag} / ${c.source_type}) ${c.content.slice(0, 400)}`
  ).join('\n\n') || '(no direct evidence — synthesize generically with framework anchor only)';

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: `You write SEO-optimized landing pages for Bettroi (B2B AI software studio).

Bettroi voice: direct, operator-credible, hospital-owner + Dubai-FZE founder. Hates fluff and cliches. Specific numbers when available. Indian English natural.

A great Bettroi SEO landing page has:
1. **Hero H1** — keyword-rich but readable: "AI Agents for Multi-Specialty Hospitals" (not "Revolutionary AI Solutions for Healthcare Excellence")
2. **Hero subhead** — 1 sentence saying what we do for THIS combo, with one concrete outcome
3. **The problem section** — 3 sentences. Specific operational pain THIS vertical has with THIS use-case.
4. **What we build** — 4-6 bullets. Specific deliverables (not "AI capabilities" — name actual artifacts like "OPD triage agent", "discharge documentation bot")
5. **How we do it** — anchor in the Be AI-First framework stages
6. **Proof / what we've built before** — 2-3 short sentences referencing actual prior work IF the evidence supports it
7. **Pricing anchor** — "Discovery audit from ₹X | Pilot from ₹Y | Full transformation from ₹Z" (use realistic Indian-market ranges)
8. **Strong specific CTA** — "Book a 30-min Discovery call" with email mailto:hi@bettroi.com
9. **FAQ section** — 4-5 questions a buyer in this vertical would actually ask
10. **Meta description** — 1 sentence, 150-160 chars

Output a JSON object:
- "h1": string
- "slug": kebab-case URL slug (max 60 chars)
- "meta_title": 50-60 chars, includes primary keyword
- "meta_description": 150-160 chars
- "primary_keyword": exact match keyword (e.g. "ai agents for hospitals")
- "body_markdown": the full page body as Markdown (no frontmatter, no H1 — H1 is separate)
- "faqs": array of {question, answer} (4-5 items)
- "cta_email": "hi@bettroi.com"

NO em-dashes in titles. No "Revolutionary". No "Cutting-edge". No "Synergy". Specific > vague.`,
    tools: [{
      name: 'submit_seo_page',
      description: 'Submit the SEO landing page as structured data',
      input_schema: {
        type: 'object',
        properties: {
          h1:               { type: 'string' },
          slug:             { type: 'string' },
          meta_title:       { type: 'string' },
          meta_description: { type: 'string' },
          primary_keyword:  { type: 'string' },
          body_markdown:    { type: 'string' },
          faqs:             { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question','answer'] } },
          cta_email:        { type: 'string' },
        },
        required: ['h1','slug','meta_title','meta_description','primary_keyword','body_markdown','faqs'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_seo_page' },
    messages: [{ role: 'user', content: `VERTICAL: ${vertical}
USE CASE: ${useCase}

FRAMEWORK ANCHOR:
${BE_AI_FIRST_FRAMEWORK}

EVIDENCE FROM BETTROI'S OWN PROJECTS (use only what's supportable):
${evidenceText}` }],
  });
  return res.content.find(c => c.type === 'tool_use')?.input ?? null;
}

function safeSlug(s) { return (s || 'page').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80); }

async function run() {
  await mkdir(TARGET_DIR, { recursive: true });

  const combos = [];
  for (const v of VERTICALS) for (const u of USE_CASES) combos.push({ v, u });
  console.log(`Total combinations: ${combos.length} | Generating up to ${MAX}`);

  let made = 0;
  const summary = [];

  for (const { v, u } of combos) {
    if (made >= MAX) break;
    const slug = `${safeSlug(v)}-${safeSlug(u)}`;
    const filePath = join(TARGET_DIR, `${slug}.md`);

    // Skip if already generated (idempotent re-run)
    try { await import('node:fs').then(fs => fs.statSync(filePath)); console.log(`  ⊘ ${slug} — exists, skipping`); continue; }
    catch { /* not exists, proceed */ }

    console.log(`\n📄 ${v} × ${u}`);
    const evidence = await gatherEvidence(v, u);
    console.log(`  • Evidence chunks: ${evidence.length}`);

    let page;
    try { page = await generatePage({ vertical: v, useCase: u, evidence }); }
    catch (e) { console.error(`  ✗ generate failed: ${e.message}`); continue; }
    if (!page) { console.log('  ⚠ no page returned'); continue; }

    const md = [
      '---',
      `slug: ${page.slug}`,
      `title: ${JSON.stringify(page.meta_title)}`,
      `description: ${JSON.stringify(page.meta_description)}`,
      `keyword: ${JSON.stringify(page.primary_keyword)}`,
      `vertical: ${v}`,
      `use_case: ${u}`,
      `generated: ${new Date().toISOString().slice(0,10)}`,
      `status: draft`,
      `off_limits: false`,
      '---',
      '',
      `# ${page.h1}`,
      '',
      page.body_markdown,
      '',
      '## Frequently asked questions',
      '',
      ...page.faqs.flatMap(q => [`**${q.question}**`, '', q.answer, '']),
      '',
      `---`,
      `*Ready to talk? Email ${page.cta_email ?? 'hi@bettroi.com'} or book a 30-min Discovery call.*`,
    ].join('\n');

    if (DRY) { console.log(`  [DRY] would write ${filePath} (${md.length} chars)`); made++; continue; }

    await writeFile(filePath, md);
    console.log(`  ✓ Wrote ${filePath}`);
    summary.push({ v, u, slug: page.slug, keyword: page.primary_keyword });
    made++;
  }

  console.log(`\n✓ Generated ${made} SEO page(s) in ${TARGET_DIR}`);

  // Index file
  if (made && !DRY) {
    const indexMd = [
      '---',
      `generated: ${new Date().toISOString().slice(0,10)}`,
      `count: ${summary.length}`,
      `off_limits: false`,
      '---',
      '',
      `# Programmatic SEO Index — ${new Date().toISOString().slice(0,10)}`,
      '',
      `${summary.length} pages, each a (vertical × use-case) combo from the Be AI-First framework.`,
      '',
      '| Vertical | Use case | Slug | Keyword |',
      '|---|---|---|---|',
      ...summary.map(s => `| ${s.v} | ${s.u} | [${s.slug}](./${s.slug}.md) | ${s.keyword} |`),
    ].join('\n');
    await writeFile(join(TARGET_DIR, 'INDEX.md'), indexMd);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
