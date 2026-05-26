// proposify-from-fathom.mjs — Fathom call → AI picks Proposify skill template →
// drafts proposal content + pricing → inserts as status='draft' into proposifyai.com.
// Murali edits/sends from the Proposify web app.
//
// Usage: node --env-file=.env.local _Murali-Second-Brain/proposify-from-fathom.mjs [--days=3] [--dry]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain    = createClient(process.env.SUPABASE_URL,         process.env.SUPABASE_SERVICE_KEY,        { auth: { persistSession: false } });
const proposify = createClient(process.env.PROPOSIFY_SUPABASE_URL, process.env.PROPOSIFY_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const FATHOM_API = 'https://api.fathom.ai/external/v1';
const FATHOM_HEADERS = { 'X-Api-Key': process.env.FATHOM_API_KEY, 'Content-Type': 'application/json' };

const PROPOSIFY_REPO   = process.env.PROPOSIFY_REPO || '/Users/murali/proposifyai.com/proposifyai';
const SKILLS_DIR       = join(PROPOSIFY_REPO, '.claude/skills');
const PROPOSIFY_USER_ID = process.env.PROPOSIFY_USER_ID || '42c7094e-761c-4d8c-b84b-6999a443e738'; // Murali

const INTERNAL_DOMAINS = new Set(['bettroi.com', 'hopehospital.com', 'hopetech.me', 'gmail.com', 'outlook.com']);
const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '3', 10);
const DRY  = process.argv.includes('--dry');
const STATE_KEY = 'U_PROPOSIFY_DRAFTED';

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSummary(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (Array.isArray(s)) return s.map(normalizeSummary).join('\n');
  if (typeof s === 'object') return Object.entries(s).map(([k,v]) => `${k}: ${normalizeSummary(v)}`).join('\n');
  return String(s);
}

async function getState() {
  const { data } = await brain.from('brain_user_state').select('last_items_dm').eq('slack_user_id', STATE_KEY).maybeSingle();
  return new Set((data?.last_items_dm ?? []).map(String));
}
async function saveState(set) {
  await brain.from('brain_user_state').upsert({
    slack_user_id: STATE_KEY, last_items_dm: [...set].slice(-1000).map(String), updated_at: new Date().toISOString(),
  }, { onConflict: 'slack_user_id' });
}

async function fathomFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url, { headers: FATHOM_HEADERS });
    if (r.ok || r.status < 500) return r;
    await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error(`Fathom unavailable`);
}

async function fetchRecentMeetings() {
  const r = await fathomFetch(`${FATHOM_API}/meetings?limit=50`);
  if (!r.ok) throw new Error(`Fathom: ${r.status}`);
  const data = await r.json();
  const all = data.items ?? data.meetings ?? data.data ?? data.results ?? [];
  const cutoff = new Date(Date.now() - DAYS * 86400000);
  return all.filter(m => new Date(m.recording_end_time ?? m.created_at ?? 0) > cutoff);
}

async function fetchSummary(recordingId) {
  try {
    const r = await fathomFetch(`${FATHOM_API}/recordings/${recordingId}/summary`);
    if (!r.ok) return '';
    const d = await r.json();
    return normalizeSummary(d.summary ?? d.content ?? d.text ?? d.default_summary ?? d);
  } catch { return ''; }
}

// ── Skill loading ───────────────────────────────────────────────────────────

async function loadSkills() {
  const files = (await readdir(SKILLS_DIR)).filter(f => f.startsWith('generate-') && f.endsWith('-proposal.md'));
  const skills = [];
  for (const file of files) {
    const body = await readFile(join(SKILLS_DIR, file), 'utf8');
    // Title is the first heading
    const titleMatch = body.match(/^#\s+(.+)$/m);
    // Short description from first sentence after the title
    const descMatch = body.split('\n').slice(1).find(l => l.trim() && !l.startsWith('#'));
    skills.push({
      file,
      key: file.replace(/^generate-|-proposal\.md$/g, ''),
      title: titleMatch?.[1] ?? file,
      desc:  (descMatch ?? '').slice(0, 200),
      body,
    });
  }
  return skills;
}

async function pickSkill({ skills, meeting, summary, attendee }) {
  const list = skills.map(s => `- ${s.key}: ${s.title} — ${s.desc}`).join('\n');
  const res = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: `Pick the single best matching proposal skill key for this sales call. Output ONLY the key string from the list, nothing else.`,
    messages: [{ role: 'user', content: `MEETING: ${meeting.title}\nATTENDEE: ${attendee.name} <${attendee.email}>\n\nSUMMARY:\n${summary.slice(0, 2500)}\n\nSKILLS:\n${list}\n\nPick one key:` }],
  });
  const text = res.content[0].text.trim().replace(/[^a-z0-9-]/g, '');
  return skills.find(s => s.key === text) ?? skills.find(s => s.key === 'business') ?? skills[0];
}

// ── Proposal generation ─────────────────────────────────────────────────────

async function draftProposal({ skill, meeting, summary, attendee }) {
  const sys = `You are drafting a sales proposal for Bettroi (B2B AI software studio, Nagpur India + Bettroi FZE Dubai).

Follow this skill spec — use its structure, tone, and section names exactly:

---SKILL SPEC---
${skill.body.slice(0, 8000)}
---END SKILL---

Output a JSON object with:
- "title": proposal title (60-120 chars, includes client + project)
- "client_name": primary contact name
- "client_email": their email
- "client_company": company name
- "currency": "INR" | "AED" | "USD"
- "total_value": number (rough estimate based on scope in call) or null
- "content": full proposal HTML body — use h1/h2/h3, p, ul/li, table. Inline styles OK. NO <html>/<head>/<body> wrappers. Should be production-quality, 2000-4000 words.
- "pricing": JSON object {total: number, currency: string, items: [{description, price, unit}]}
- "metadata": {scope_summary: "<1 line>", confidence: "high"|"medium"|"low", source_meeting_id: "${meeting.recording_id ?? meeting.id}"}

Use the call summary as your ONLY source of project scope/requirements. Don't invent numbers — if pricing isn't discussed, estimate based on similar Bettroi work patterns from the skill spec.

Output ONLY the JSON.`;

  const user = `MEETING: ${meeting.title}
DATE: ${meeting.recording_end_time?.slice(0,10)}
ATTENDEE: ${attendee.name} <${attendee.email}>
COMPANY DOMAIN: ${attendee.email_domain ?? attendee.email?.split('@')[1]}

CALL RECAP / SUMMARY:
${summary.slice(0, 8000)}

ACTION ITEMS captured by Fathom:
${meeting.action_items ? JSON.stringify(meeting.action_items).slice(0, 2000) : '(none)'}

FATHOM LINK: ${meeting.share_url ?? meeting.url}

Draft the proposal as JSON:`;

  // Use tool_use to force structured JSON output — much more reliable than regex
  // extraction when the content field contains lots of HTML / quotes.
  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: sys,
    tools: [{
      name: 'submit_proposal',
      description: 'Submit the drafted proposal as structured data',
      input_schema: {
        type: 'object',
        properties: {
          title:          { type: 'string' },
          client_name:    { type: 'string' },
          client_email:   { type: 'string' },
          client_company: { type: 'string' },
          currency:       { type: 'string' },
          total_value:    { type: ['number', 'null'] },
          content:        { type: 'string', description: 'Full proposal HTML body' },
          pricing:        { type: 'object' },
          metadata:       { type: 'object' },
        },
        required: ['title','client_name','client_email','client_company','currency','content','pricing','metadata'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_proposal' },
    messages: [{ role: 'user', content: user }],
  });
  const toolUse = res.content.find(c => c.type === 'tool_use');
  if (!toolUse) throw new Error('No tool_use in response: ' + JSON.stringify(res.content).slice(0,200));
  return toolUse.input;
}

// ── Insert into Proposify ───────────────────────────────────────────────────

async function insertProposal({ draft, meeting, skill }) {
  const row = {
    user_id: PROPOSIFY_USER_ID,
    title: draft.title,
    client_name: draft.client_name,
    client_email: draft.client_email,
    client_company: draft.client_company,
    status: 'draft',
    content: draft.content,
    pricing: draft.pricing,
    metadata: {
      ...draft.metadata,
      source: 'fathom-auto',
      skill_used: skill.key,
      fathom_url: meeting.share_url ?? meeting.url,
      generated_at: new Date().toISOString(),
    },
    currency: draft.currency || 'INR',
    total_value: draft.total_value ?? draft.pricing?.total ?? null,
    document_type: 'proposal',
  };
  const { data, error } = await proposify.from('proposals').insert(row).select('id').single();
  if (error) throw new Error(`Proposify insert: ${error.message}`);
  return data.id;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const meetings = await fetchRecentMeetings();
  console.log(`Fathom meetings in last ${DAYS} day(s): ${meetings.length}`);
  if (!meetings.length) return;

  const skills = await loadSkills();
  console.log(`Loaded ${skills.length} Proposify skill template(s)`);

  const state = await getState();
  const drafted = [];

  for (const meeting of meetings) {
    const externals = (meeting.calendar_invitees ?? [])
      .filter(a => a.email && !INTERNAL_DOMAINS.has((a.email_domain || a.email.split('@')[1] || '').toLowerCase()));
    if (!externals.length) continue;

    const key = `${meeting.recording_id ?? meeting.id}`;
    if (state.has(key)) { console.log(`  ⊘ ${meeting.title} — already drafted in Proposify`); continue; }

    console.log(`\n📞 ${meeting.title} (${meeting.recording_end_time?.slice(0,10)})`);
    const summary = await fetchSummary(meeting.recording_id ?? meeting.id);
    if (!summary && !meeting.action_items) { console.log('  ⚠ no content — skipping'); continue; }

    const primary = externals[0];
    const skill = await pickSkill({ skills, meeting, summary, attendee: primary });
    console.log(`  • Skill: ${skill.key}`);

    let draft;
    try {
      draft = await draftProposal({ skill, meeting, summary, attendee: primary });
    } catch (e) { console.error(`  ✗ draft failed: ${e.message}`); continue; }

    console.log(`  • Title: ${draft.title}`);
    console.log(`  • Pricing: ${draft.currency} ${draft.total_value ?? '(none)'}`);

    if (DRY) { state.add(key); drafted.push({ meeting: meeting.title, title: draft.title, dry: true }); continue; }

    let proposalId;
    try { proposalId = await insertProposal({ draft, meeting, skill }); }
    catch (e) { console.error(`  ✗ insert failed: ${e.message}`); continue; }

    console.log(`  ✓ Inserted proposal ${proposalId}`);
    state.add(key);
    drafted.push({
      meeting: meeting.title,
      title: draft.title,
      proposalId,
      client: draft.client_company,
      total: `${draft.currency} ${draft.total_value ?? '?'}`,
      editUrl: `https://proposifyai.com/proposals/${proposalId}`,
    });
  }

  if (!DRY) await saveState(state);
  console.log(`\n✓ ${drafted.length} proposal(s) drafted in Proposify`);

  if (slack && process.env.SLACK_MURALI_USER_ID && drafted.length && !DRY) {
    const lines = drafted.map((d, i) =>
      `${i+1}. *${d.title}* — ${d.client} (${d.total})\n     <${d.editUrl}|Edit in Proposify>`
    );
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `📝 *${drafted.length} proposal draft${drafted.length===1?'':'s'} ready in Proposify*\n\n${lines.join('\n')}`,
      unfurl_links: false,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
