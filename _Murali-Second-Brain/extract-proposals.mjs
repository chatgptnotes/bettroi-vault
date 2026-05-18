// extract-proposals.mjs — scan email + meeting chunks for proposals/quotes/agreed prices
// Usage: node --env-file=.env.local _Murali-Second-Brain/extract-proposals.mjs [--days N]

import { createClient } from '@supabase/supabase-js';
import { callClaude } from './ai-client.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const DAYS = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '90', 10);

async function extractFromChunk({ text, projectTag, sourceRef, sourceType, date }) {
  const sys = `Extract every concrete PRICE/QUOTE/PROPOSAL from this content. Be precise.

For each price mentioned, output a JSON entry:
- "description": what the price is for (e.g. "NeuroQ reverse engineering", "Phase 1 deliverable")
- "amount": number only (no symbols)
- "currency": INR | AED | USD | EUR (default INR if Indian context)
- "unit": one-time | monthly | annual | per-image | per-call | etc.
- "client_name": who is paying (or null)
- "vendor_name": who is being paid (or null — usually Murali's company)
- "status": proposed | revised | agreed | invoiced | paid | rejected
- "quoted_date": YYYY-MM-DD if mentioned, else null
- "notes": 1 sentence context

Skip:
- Vague references ("the proposal", "the contract")
- General cost discussions without specific numbers
- Currency conversion mentions
- Marketing copy

If no real prices, output: {"proposals": []}
Otherwise: {"proposals": [{...}, {...}]}

Output ONLY JSON.`;

  try {
    const res = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: sys,
      messages: [{ role: 'user', content: text.slice(0, 5000) }],
    });
    const m = res.content[0].text.match(/\{[\s\S]*\}/);
    if (!m) return [];
    return (JSON.parse(m[0]).proposals ?? []).map(p => ({
      project_tag: projectTag,
      client_name: p.client_name?.slice(0, 200) ?? null,
      vendor_name: p.vendor_name?.slice(0, 200) ?? null,
      description: p.description?.slice(0, 500),
      amount: typeof p.amount === 'number' ? p.amount : null,
      currency: p.currency ?? 'INR',
      unit: p.unit ?? null,
      status: p.status ?? 'proposed',
      source_type: sourceType,
      source_ref: sourceRef,
      quoted_date: p.quoted_date ?? date,
      notes: p.notes ?? null,
    })).filter(p => p.description && p.amount);
  } catch (e) {
    console.warn(`  extract failed: ${e.message}`);
    return [];
  }
}

async function run() {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();

  // Pull chunks from emails + meetings (most likely places for pricing)
  const { data: chunks, error } = await supabase
    .from('brain_chunks')
    .select('content, source_ref, source_type, project_tag, metadata, created_at')
    .gte('created_at', since)
    .or('source_type.eq.email,source_ref.like.%/meetings/%');
  if (error) { console.error(error); process.exit(1); }

  // Group by source_ref so we process each meeting/email once with full context
  const sources = {};
  for (const c of chunks ?? []) {
    if (!sources[c.source_ref]) {
      sources[c.source_ref] = {
        text: '', project: c.project_tag, type: c.source_type,
        date: c.metadata?.date?.slice(0, 10) ?? c.created_at.slice(0, 10),
      };
    }
    sources[c.source_ref].text += c.content + '\n';
  }

  const entries = Object.entries(sources);
  console.log(`Scanning ${entries.length} sources for proposals/quotes...`);

  let total = 0, sourcesWithPrices = 0;
  for (let i = 0; i < entries.length; i++) {
    const [ref, src] = entries[i];
    const proposals = await extractFromChunk({
      text: src.text, projectTag: src.project, sourceRef: ref,
      sourceType: src.type, date: src.date,
    });
    if (proposals.length) {
      sourcesWithPrices++;
      const { error: insErr } = await supabase
        .from('brain_proposals')
        .insert(proposals);
      if (insErr) {
        console.warn(`  ✗ insert failed for ${ref}: ${insErr.message}`);
      } else {
        total += proposals.length;
        proposals.forEach(p => process.stdout.write(`💰 [${p.currency}${p.amount}] ${p.description.slice(0, 60)} (${p.status}) ← ${p.project_tag}\n`));
      }
    } else {
      process.stdout.write('·');
    }
    if (i % 25 === 24) console.log(` ${i+1}/${entries.length}`);
  }

  console.log(`\n\n✓ Extracted ${total} proposals from ${sourcesWithPrices} sources (of ${entries.length} scanned).`);

  // Summary by currency
  const { data: byCurrency } = await supabase.from('brain_proposals').select('currency, status, amount');
  const sums = {};
  for (const p of byCurrency ?? []) {
    const k = `${p.currency} ${p.status}`;
    sums[k] = (sums[k] || 0) + (p.amount || 0);
  }
  console.log('\nTotals by currency × status:');
  Object.entries(sums).sort().forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v.toLocaleString()}`));
}

run().catch(e => { console.error(e); process.exit(1); });
