// lead-enrichment.mjs — enrich an inbound lead via Apollo (preferred) or
// Firecrawl (fallback), check brain for prior mentions, score ICP fit,
// route to the right owner with a 2-line briefing.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/lead-enrichment.mjs --email=name@company.com
//   node --env-file=.env.local _Murali-Second-Brain/lead-enrichment.mjs --domain=company.com
//   node --env-file=.env.local _Murali-Second-Brain/lead-enrichment.mjs --hubspot-watch   (poll HubSpot)

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const DRY = !!args.dry;

// ── Bettroi ICP ─────────────────────────────────────────────────────────────
// Edit to tune routing
const ICP = {
  industries: ['healthcare', 'hospital', 'manufacturing', 'energy', 'media',
                'government', 'logistics', 'pharma', 'medical-device', 'oil & gas'],
  use_cases:  ['HMS', 'EMR', 'AI agents', 'SCADA', 'workflow automation',
                'NABH', 'compliance', 'document AI', 'BPM'],
  size_min: 50,       // employees
  size_max: 50000,
  geo:      ['India', 'UAE', 'Saudi Arabia', 'GCC', 'Singapore'],
};

const OWNERS = {
  healthcare:  { name: 'Murali', slack: process.env.SLACK_MURALI_USER_ID, reason: 'Hope Hospital domain knowledge' },
  manufacturing:{ name: 'BT',     slack: 'U0B2XRQLBEG',                    reason: 'COO — ops/manufacturing track record' },
  default:     { name: 'Roma',   slack: 'U0B2NR9MWHZ',                    reason: 'Sales lead — owns inbound by default' },
};

// ── Apollo enrichment ───────────────────────────────────────────────────────

async function apolloEnrichByEmail(email) {
  if (!process.env.APOLLO_API_KEY) return null;
  const r = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'application/json', 'x-api-key': process.env.APOLLO_API_KEY },
    body: JSON.stringify({ email, reveal_personal_emails: false }),
  });
  if (!r.ok) { console.warn(`Apollo people: ${r.status}`); return null; }
  const d = await r.json();
  return d.person ?? null;
}

async function apolloEnrichByDomain(domain) {
  if (!process.env.APOLLO_API_KEY) return null;
  const r = await fetch('https://api.apollo.io/api/v1/organizations/enrich?domain=' + encodeURIComponent(domain), {
    headers: { 'x-api-key': process.env.APOLLO_API_KEY },
  });
  if (!r.ok) { console.warn(`Apollo org: ${r.status}`); return null; }
  const d = await r.json();
  return d.organization ?? null;
}

// ── Firecrawl fallback (free, public-web) ──────────────────────────────────

async function firecrawlEnrichDomain(domain) {
  if (!process.env.FIRECRAWL_API_KEY) return null;
  const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    body: JSON.stringify({ url: `https://${domain}`, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!r.ok) { console.warn(`Firecrawl: ${r.status}`); return null; }
  const d = await r.json();
  return { markdown: d.data?.markdown?.slice(0, 4000), metadata: d.data?.metadata };
}

// ── Brain mention check ────────────────────────────────────────────────────

async function brainPrior(needle) {
  const { data } = await brain.from('brain_chunks')
    .select('project_tag, source_type, source_ref, content, created_at')
    .ilike('content', `%${needle}%`)
    .eq('off_limits', false)
    .order('created_at', { ascending: false })
    .limit(5);
  return data ?? [];
}

// ── ICP scoring + routing ──────────────────────────────────────────────────

async function scoreAndRoute({ apolloPerson, apolloOrg, firecrawl, priorMentions, raw }) {
  const ctx = JSON.stringify({
    person: apolloPerson ? { name: apolloPerson.name, title: apolloPerson.title, linkedin: apolloPerson.linkedin_url } : null,
    org: apolloOrg ? {
      name: apolloOrg.name, industry: apolloOrg.industry,
      size: apolloOrg.estimated_num_employees, country: apolloOrg.country,
      keywords: apolloOrg.keywords?.slice(0,8), short_description: apolloOrg.short_description?.slice(0,300),
    } : null,
    website_snippet: firecrawl?.markdown?.slice(0, 1500),
    prior_mentions: priorMentions.length,
    prior_sample: priorMentions[0]?.content?.slice(0, 300),
    icp: ICP,
  }, null, 2);

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are Bettroi's lead-routing analyst. Score and route this inbound lead.

Output a JSON object:
- "fit_score":   0-100 (how well do they match the ICP)
- "fit_reason":  one line — why this score
- "industry":    one of the ICP industries, or "other"
- "company_brief": 2-3 lines describing what the company does (from data, not guessed)
- "person_brief": 1-2 lines describing the contact's likely role
- "owner_recommendation": "Murali" | "BT" | "Roma" | (other Bettroi name)
- "owner_reason": one line
- "pitch_angle":  one line — the most relevant Bettroi capability to lead with
- "red_flags":    array of strings — anything that suggests bad fit (or [])
- "first_response_draft": 90-150 word reply Murali could send to make a good first impression

Be honest. If data is thin, say "low confidence" in fit_reason.`,
    tools: [{
      name: 'submit_lead_assessment',
      description: 'Submit the lead assessment as structured data',
      input_schema: {
        type: 'object',
        properties: {
          fit_score:              { type: 'number' },
          fit_reason:             { type: 'string' },
          industry:               { type: 'string' },
          company_brief:          { type: 'string' },
          person_brief:           { type: 'string' },
          owner_recommendation:   { type: 'string' },
          owner_reason:           { type: 'string' },
          pitch_angle:            { type: 'string' },
          red_flags:              { type: 'array', items: { type: 'string' } },
          first_response_draft:   { type: 'string' },
        },
        required: ['fit_score','fit_reason','industry','company_brief','owner_recommendation','pitch_angle','first_response_draft'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_lead_assessment' },
    messages: [{ role: 'user', content: `LEAD: ${JSON.stringify(raw)}\n\nCONTEXT:\n${ctx}` }],
  });
  return res.content.find(c => c.type === 'tool_use')?.input ?? null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function processLead({ email, domain }) {
  if (!email && !domain && email) domain = email.split('@')[1];
  if (!domain && email) domain = email.split('@')[1];

  console.log(`\n🎯 Enriching: ${email ?? domain}`);

  // 1. Apollo
  const apolloPerson = email ? await apolloEnrichByEmail(email) : null;
  const apolloOrg    = domain ? await apolloEnrichByDomain(domain) : null;
  console.log(`  • Apollo: person=${!!apolloPerson} org=${!!apolloOrg}`);

  // 2. Firecrawl fallback for website context
  let firecrawl = null;
  if (!apolloOrg && domain) {
    firecrawl = await firecrawlEnrichDomain(domain);
    console.log(`  • Firecrawl: ${firecrawl?.markdown ? `${firecrawl.markdown.length} chars` : 'none'}`);
  }

  // 3. Brain check — have we touched this domain/company before?
  const priorMentions = await brainPrior(domain || email);
  console.log(`  • Prior mentions: ${priorMentions.length}`);

  // 4. Score + route
  const assessment = await scoreAndRoute({
    apolloPerson, apolloOrg, firecrawl, priorMentions,
    raw: { email, domain },
  });
  if (!assessment) { console.error('  ✗ assessment failed'); return; }

  console.log(`  • Fit:    ${assessment.fit_score}/100 — ${assessment.fit_reason}`);
  console.log(`  • Route:  ${assessment.owner_recommendation} (${assessment.owner_reason})`);
  console.log(`  • Pitch:  ${assessment.pitch_angle}`);
  if (assessment.red_flags?.length) console.log(`  • Red flags: ${assessment.red_flags.join(', ')}`);

  if (DRY) {
    console.log('\n--- Draft first response ---\n' + assessment.first_response_draft);
    return assessment;
  }

  // Slack notification to recommended owner
  if (slack && assessment.owner_recommendation) {
    const ownerSlack =
      (assessment.owner_recommendation.toLowerCase().includes('bt')     && 'U0B2XRQLBEG') ||
      (assessment.owner_recommendation.toLowerCase().includes('roma')   && 'U0B2NR9MWHZ') ||
      (assessment.owner_recommendation.toLowerCase().includes('haritha')&& 'U0B2CPRQQTZ') ||
      process.env.SLACK_MURALI_USER_ID;
    if (ownerSlack) {
      const open = await slack.conversations.open({ users: ownerSlack });
      await slack.chat.postMessage({
        channel: open.channel.id,
        text: `🎯 *New inbound lead* — fit ${assessment.fit_score}/100\n\n*Lead:* ${email ?? domain}\n*Company:* ${assessment.company_brief}\n*Person:* ${assessment.person_brief ?? '(unknown)'}\n*Pitch angle:* ${assessment.pitch_angle}\n${assessment.red_flags?.length ? `*Red flags:* ${assessment.red_flags.join(', ')}\n` : ''}\n*Draft first response:*\n\`\`\`\n${assessment.first_response_draft}\n\`\`\``,
      });
    }
  }

  return assessment;
}

async function main() {
  if (args.email)  return processLead({ email: args.email });
  if (args.domain) return processLead({ domain: args.domain });
  console.error('Usage: --email=name@company.com  OR  --domain=company.com');
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
