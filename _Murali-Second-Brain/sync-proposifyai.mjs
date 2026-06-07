// sync-proposifyai.mjs — pulls all proposals from proposifyai.com Supabase,
// writes each as a markdown file under Proposals/{client}/ in the vault.
// Also extracts pricing into brain_proposals table.

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ingestText } from './ingest.mjs';

const propo = createClient(process.env.PROPOSIFY_SUPABASE_URL, process.env.PROPOSIFY_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET = join(VAULT_ROOT, 'Proposals');

function safeSlug(s) {
  return (s || 'untitled').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function extractPricing(p) {
  // pricing column is JSONB — may have {total, currency, items[]}
  const out = [];
  if (!p.pricing || typeof p.pricing !== 'object') return out;
  if (p.pricing.total && p.pricing.total > 0) {
    out.push({
      project_tag: 'Proposals',
      client_name: p.client_company || p.client_name || 'unknown',
      description: p.title || 'Proposal total',
      amount: Number(p.pricing.total),
      currency: p.pricing.currency || 'INR',
      status: p.status === 'sent' ? 'proposed' : 'draft',
      source_type: 'proposifyai',
      source_ref: `proposifyai://proposals/${p.id}`,
      quoted_date: p.created_at?.slice(0, 10),
      notes: 'From proposifyai.com',
    });
  }
  for (const item of (p.pricing.items ?? p.pricing.lineItems ?? [])) {
    if (item.price && item.price > 0) {
      out.push({
        project_tag: 'Proposals',
        client_name: p.client_company || p.client_name || 'unknown',
        description: item.description || item.name || 'Line item',
        amount: Number(item.price),
        currency: p.pricing.currency || 'INR',
        status: p.status === 'sent' ? 'proposed' : 'draft',
        source_type: 'proposifyai',
        source_ref: `proposifyai://proposals/${p.id}`,
        quoted_date: p.created_at?.slice(0, 10),
        notes: item.notes ?? null,
      });
    }
  }
  return out;
}

function fmtMd(p) {
  const fm = [
    '---',
    `proposal_id: ${p.id}`,
    `source: proposifyai`,
    `client_company: ${JSON.stringify(p.client_company ?? '')}`,
    `client_name: ${JSON.stringify(p.client_name ?? '')}`,
    `client_email: ${JSON.stringify(p.client_email ?? '')}`,
    `title: ${JSON.stringify(p.title ?? '')}`,
    `proposal_status: ${JSON.stringify(p.status ?? 'draft')}`,
    `template_id: ${p.template_id ?? 'null'}`,
    p.ai_confidence_score != null ? `ai_confidence_score: ${p.ai_confidence_score}` : null,
    `created_at: ${p.created_at}`,
    p.pricing ? `pricing_total: ${JSON.stringify(p.pricing.total ?? null)}` : null,
    p.pricing?.currency ? `currency: ${p.pricing.currency}` : null,
    'project: Proposals',
    '---',
    '',
  ].filter(Boolean).join('\n');

  let contentStr = '';
  if (typeof p.content === 'string') contentStr = p.content;
  else if (p.content) contentStr = JSON.stringify(p.content, null, 2);

  const pricingBlock = p.pricing ? `\n## Pricing\n\n\`\`\`json\n${JSON.stringify(p.pricing, null, 2)}\n\`\`\`\n` : '';
  const metaBlock = p.metadata ? `\n## Metadata\n\n\`\`\`json\n${JSON.stringify(p.metadata, null, 2)}\n\`\`\`\n` : '';

  return fm + [
    `# ${p.title || '(untitled proposal)'}`,
    '',
    `**Client:** ${p.client_company || p.client_name || 'unknown'}${p.client_email ? ' · ' + p.client_email : ''}`,
    `**Status:** ${p.status || 'draft'}  ·  **Created:** ${p.created_at?.slice(0, 10)}`,
    '',
    '---',
    '',
    contentStr || '_(no content)_',
    pricingBlock,
    metaBlock,
  ].join('\n');
}

// POs / invoices / proposals are tracked in project_documents (with amount,
// delivery + stage) and project_payments (paid / advance). Financial, so these
// go into brain_chunks as off_limits=true.
async function syncProjectDocuments() {
  const { data: docs, error: docErr } = await propo.from('project_documents').select('*');
  if (docErr) { console.warn(`project_documents skipped: ${docErr.message}`); return; }
  const { data: pays } = await propo.from('project_payments').select('*');
  const payByKey = Object.fromEntries((pays ?? []).map(p => [`${p.project}::${p.direction}`, p]));

  let ingested = 0;
  for (const d of docs ?? []) {
    const pay = payByKey[`${d.project}::${d.direction}`];
    const text = [
      `${(d.doc_type ?? 'document').toUpperCase()}: ${d.label ?? d.filename ?? '(untitled)'}`,
      `Project: ${d.project}`,
      `Direction: ${d.direction}`,
      d.amount ? `Amount: ${d.amount}` : null,
      `Delivered: ${d.delivered ? 'yes' : 'no'}`,
      d.stage ? `Stage: ${d.stage}` : null,
      pay ? `Paid: ${pay.paid ? 'yes' : 'no'}  ·  Advance taken: ${pay.advance_taken ? 'yes' : 'no'}` : null,
      pay?.note ? `Payment note: ${pay.note}` : null,
    ].filter(v => v !== null && v !== undefined).join('\n');

    await ingestText({
      text,
      project_tag: d.project,
      source_type: 'proposifyai',
      source_ref: `proposifyai://document/${d.id}`,
      metadata: {
        docType: d.doc_type, project: d.project, direction: d.direction,
        amount: d.amount, delivered: d.delivered, stage: d.stage,
        paid: pay?.paid ?? null, advance_taken: pay?.advance_taken ?? null,
        off_limits: true,  // financial — restricted
      },
    });
    ingested++;
  }
  console.log(`✓ Ingested ${ingested} PO/invoice/proposal document(s) into brain_chunks (off_limits)`);
}

async function run() {
  const { data: proposals } = await propo.from('proposals').select('*').order('created_at', { ascending: false });
  console.log(`Pulled ${proposals.length} proposals from proposifyai.com`);

  await mkdir(TARGET, { recursive: true });

  let mdWritten = 0;
  const priceRows = [];
  for (const p of proposals) {
    const clientSlug = safeSlug(p.client_company || p.client_name || 'unknown-client');
    const titleSlug = safeSlug(p.title);
    const date = (p.created_at || new Date().toISOString()).slice(0, 10);
    const dir = join(TARGET, clientSlug);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${date}-${titleSlug}.md`);
    await writeFile(filePath, fmtMd(p));
    mdWritten++;
    priceRows.push(...extractPricing(p));
  }
  console.log(`✓ Wrote ${mdWritten} .md files`);

  if (priceRows.length) {
    const { error } = await brain.from('brain_proposals').insert(priceRows);
    if (error) console.error('brain_proposals insert:', error.message);
    else console.log(`✓ Inserted ${priceRows.length} pricing rows into brain_proposals`);
  } else {
    console.log('(No pricing data to extract)');
  }

  // POs / invoices / proposal-tracker documents (financial, off_limits)
  await syncProjectDocuments();

  console.log('\nNext: npm run brain:obsidian   (ingests the proposal .md files into brain)');
}

run().catch(e => { console.error(e); process.exit(1); });
