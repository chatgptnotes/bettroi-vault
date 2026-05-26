// hubspot-from-fathom.mjs — for every recent Fathom call, extract company/deal
// signal and upsert into HubSpot CRM. Auto-CRM admin so sales reps never copy/paste.
// Usage: node --env-file=.env.local _Murali-Second-Brain/hubspot-from-fathom.mjs [--days=2] [--dry]
//
// Requires HUBSPOT_TOKEN with CRM read/write scopes (Private App):
//   crm.objects.contacts.write, crm.objects.companies.write,
//   crm.objects.deals.write, crm.engagements.write

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';
import { WebClient } from '@slack/web-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const FATHOM_API = 'https://api.fathom.ai/external/v1';
const FATHOM_HEADERS = { 'X-Api-Key': process.env.FATHOM_API_KEY, 'Content-Type': 'application/json' };
const HUBSPOT_API = 'https://api.hubapi.com';
const HUBSPOT_HEADERS = { Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' };

const INTERNAL_DOMAINS = new Set(['bettroi.com', 'hopehospital.com', 'hopetech.me', 'gmail.com', 'outlook.com']);
const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '2', 10);
const DRY = process.argv.includes('--dry');
const STATE_KEY = 'U_HUBSPOT_SYNCED';

async function getSynced() {
  const { data } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', STATE_KEY).maybeSingle();
  return new Set((data?.last_items_dm ?? []).map(String));
}
async function saveSynced(set) {
  await supabase.from('brain_user_state').upsert({
    slack_user_id: STATE_KEY, last_items_dm: [...set].slice(-1000).map(String), updated_at: new Date().toISOString(),
  }, { onConflict: 'slack_user_id' });
}

function normalizeSummary(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (Array.isArray(s)) return s.map(normalizeSummary).join('\n');
  if (typeof s === 'object') return Object.entries(s).map(([k,v]) => `${k}: ${normalizeSummary(v)}`).join('\n');
  return String(s);
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

// ── HubSpot client ──────────────────────────────────────────────────────────

async function hubspot(path, method = 'GET', body) {
  const r = await fetch(`${HUBSPOT_API}${path}`, {
    method,
    headers: HUBSPOT_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`HubSpot ${method} ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function findOrCreateContact({ email, name }) {
  // Search by email
  const search = await hubspot('/crm/v3/objects/contacts/search', 'POST', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['email', 'firstname', 'lastname', 'company'],
    limit: 1,
  }).catch(() => null);

  if (search?.results?.length) return search.results[0];

  // Create
  const [firstname, ...rest] = (name || email.split('@')[0]).split(/\s+/);
  return hubspot('/crm/v3/objects/contacts', 'POST', {
    properties: {
      email,
      firstname: firstname || '',
      lastname: rest.join(' ') || '',
    },
  });
}

async function findOrCreateCompany({ domain, name }) {
  if (!domain) return null;
  const search = await hubspot('/crm/v3/objects/companies/search', 'POST', {
    filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] }],
    properties: ['name', 'domain'],
    limit: 1,
  }).catch(() => null);
  if (search?.results?.length) return search.results[0];
  return hubspot('/crm/v3/objects/companies', 'POST', {
    properties: { name: name || domain, domain },
  });
}

async function logCallEngagement({ contactId, companyId, meeting, summary, extracted }) {
  const body = (extracted.recap || summary || '').slice(0, 5000);
  return hubspot('/crm/v3/objects/calls', 'POST', {
    properties: {
      hs_call_title: meeting.title?.slice(0, 250),
      hs_call_body: `<b>Fathom recap (auto):</b><br>${body.replace(/\n/g, '<br>')}<br><br><a href="${meeting.share_url ?? meeting.url}">Watch in Fathom</a>`,
      hs_call_direction: 'INBOUND',
      hs_call_disposition: 'f240bbac-87c9-4f6e-bf70-924b57d47db7', // Connected (default)
      hs_call_duration: ((new Date(meeting.recording_end_time) - new Date(meeting.recording_start_time)) / 1) || 0,
      hs_timestamp: meeting.recording_end_time ?? meeting.created_at,
    },
    associations: [
      contactId && { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }] },
      companyId && { to: { id: companyId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 182 }] },
    ].filter(Boolean),
  });
}

// ── Extraction ──────────────────────────────────────────────────────────────

async function extractCRMSignals({ meeting, summary, attendee }) {
  const sys = `You extract CRM-grade signals from a sales call recap.

Output ONLY JSON with these fields:
- "company_guess": company name from email domain or call (string or null)
- "deal_stage": one of "discovery" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost" | "no-deal" — best guess
- "deal_name": "<Company> - <Product/Project>" (max 80 chars) or null
- "deal_amount_inr": rough estimate in INR (number) or null
- "next_step": one concrete next step with owner if mentioned (max 120 chars) or null
- "next_step_date": YYYY-MM-DD or null
- "recap": 3-5 bullet recap of what was discussed (markdown bullets)
- "owner_hint": who on Bettroi side owns this (Murali / BT / Roma / Haritha) or null`;

  const user = `MEETING: ${meeting.title}
DATE: ${meeting.recording_end_time?.slice(0, 10) ?? ''}
ATTENDEE: ${attendee.name} <${attendee.email}>
EMAIL DOMAIN: ${attendee.email_domain ?? attendee.email?.split('@')[1] ?? ''}

SUMMARY:
${(summary || '(no summary)').slice(0, 5000)}

ACTION ITEMS (if any):
${meeting.action_items ? JSON.stringify(meeting.action_items).slice(0, 2000) : '(none)'}`;

  const res = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  const m = res.content[0].text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const meetings = await fetchRecentMeetings();
  console.log(`Fathom meetings in last ${DAYS} day(s): ${meetings.length}`);
  if (!meetings.length) return;

  const synced = await getSynced();
  const synced_records = [];

  for (const meeting of meetings) {
    const externals = (meeting.calendar_invitees ?? [])
      .filter(a => a.email && !INTERNAL_DOMAINS.has((a.email_domain || a.email.split('@')[1] || '').toLowerCase()));
    if (!externals.length) continue;

    const key = `${meeting.recording_id ?? meeting.id}`;
    if (synced.has(key)) { console.log(`  ⊘ ${meeting.title} — already synced`); continue; }

    console.log(`\n📞 ${meeting.title} (${meeting.recording_end_time?.slice(0,10)})`);
    const summary = await fetchSummary(meeting.recording_id ?? meeting.id);

    // Pick the most likely buyer-side primary contact (first external attendee)
    const primary = externals[0];
    const extracted = await extractCRMSignals({ meeting, summary, attendee: primary });
    if (!extracted) { console.log('  ⚠ extraction failed — skipping'); continue; }

    console.log(`  • Company: ${extracted.company_guess} | Stage: ${extracted.deal_stage} | Owner: ${extracted.owner_hint}`);
    console.log(`  • Next step: ${extracted.next_step ?? '(none)'} ${extracted.next_step_date ?? ''}`);

    if (DRY) { synced.add(key); continue; }

    try {
      const domain = primary.email_domain || primary.email.split('@')[1];
      const company = await findOrCreateCompany({ domain, name: extracted.company_guess });
      const contact = await findOrCreateContact({ email: primary.email, name: primary.name });
      await logCallEngagement({
        contactId: contact?.id, companyId: company?.id,
        meeting, summary, extracted,
      });
      console.log(`  ✓ Logged call → company ${company?.id} / contact ${contact?.id}`);
      synced.add(key);
      synced_records.push({ meeting: meeting.title, company: extracted.company_guess, contact: primary.email, next_step: extracted.next_step });
    } catch (e) {
      console.error(`  ✗ HubSpot push failed: ${e.message}`);
    }
  }

  if (!DRY) await saveSynced(synced);
  console.log(`\n✓ Synced ${synced_records.length} call(s) to HubSpot`);

  if (slack && process.env.SLACK_MURALI_USER_ID && synced_records.length && !DRY) {
    const lines = synced_records.map((s, i) =>
      `${i+1}. *${s.meeting.slice(0,50)}* → ${s.company ?? s.contact}\n     _next:_ ${s.next_step ?? '(none)'}`
    );
    const open = await slack.conversations.open({ users: process.env.SLACK_MURALI_USER_ID });
    await slack.chat.postMessage({
      channel: open.channel.id,
      text: `🎯 *${synced_records.length} Fathom call${synced_records.length===1?'':'s'} → HubSpot*\n\n${lines.join('\n')}`,
    });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
