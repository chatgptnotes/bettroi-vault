// sync-bni-contacts.mjs — pull BNI 1-2-1 contacts from BNI Supabase,
// write each as a markdown file under BNI-Networking/contacts/ for the brain.

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const bni = createClient(process.env.BNI_SUPABASE_URL, process.env.BNI_SUPABASE_ANON_KEY);
const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const TARGET_DIR = join(VAULT_ROOT, 'BNI-Networking/contacts');

function safeSlug(s) {
  return (s || 'unknown').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function fmtBody(c, developerName) {
  const name = `${c.first ?? ''} ${c.last ?? ''}`.trim();
  const phones = (c.phones && c.phones.length) ? c.phones.join(', ') : (c.phone || '');
  return [
    '---',
    `name: ${JSON.stringify(name)}`,
    `source: bni-crm`,
    `bni_contact_id: ${c.id}`,
    c.company ? `company: ${JSON.stringify(c.company)}` : null,
    c.chapter ? `chapter: ${JSON.stringify(c.chapter)}` : null,
    c.city ? `city: ${JSON.stringify(c.city)}` : null,
    `status: ${JSON.stringify(c.status ?? 'Identified')}`,
    c.segment ? `segment: ${JSON.stringify(c.segment)}` : null,
    developerName ? `assigned_to: ${JSON.stringify(developerName)}` : null,
    c.deal_value ? `deal_value: ${c.deal_value}` : null,
    c.deal_probability ? `deal_probability: ${c.deal_probability}` : null,
    c.deal_close_date ? `deal_close_date: ${c.deal_close_date}` : null,
    c.tags?.length ? `tags: [${c.tags.map(t => JSON.stringify(t)).join(', ')}]` : null,
    phones ? `phones: ${JSON.stringify(phones)}` : null,
    c.email ? `email: ${c.email}` : null,
    c.referred_by_id ? `referred_by_id: ${c.referred_by_id}` : null,
    c.referred_to ? `referred_to: ${JSON.stringify(c.referred_to)}` : null,
    `updated_at: ${c.updated_at}`,
    '---',
    '',
    `# ${name}`,
    '',
    c.company ? `**Company:** ${c.company}` : '',
    c.city ? `**Location:** ${c.city}` : '',
    c.chapter ? `**BNI Chapter:** ${c.chapter}` : '',
    `**Status:** ${c.status ?? 'Identified'}`,
    developerName ? `**Assigned to:** ${developerName}` : '',
    phones ? `**Phone:** ${phones}` : '',
    c.email ? `**Email:** ${c.email}` : '',
    '',
    c.notes ? `## Notes\n\n${c.notes}\n` : '',
    `\n## CRM record\n\nView/edit in [BNI 121 CRM](https://hopetech.me/bni/contacts.html).\n`,
  ].filter(Boolean).join('\n');
}

async function run() {
  const { data: contacts, error: contactsErr } = await bni.from('bni_contacts').select('*').eq('hidden', false);
  if (contactsErr) throw new Error(`bni_contacts fetch failed: ${contactsErr.message}`);

  const { data: devs, error: devsErr } = await bni.from('developers').select('id,name');
  if (devsErr) throw new Error(`developers fetch failed: ${devsErr.message}`);

  const devById = Object.fromEntries((devs ?? []).map(d => [d.id, d.name.replace(/\(.*?\)/g, '').trim()]));

  await mkdir(TARGET_DIR, { recursive: true });

  let wrote = 0;
  const seenSlugs = {};
  for (const c of contacts ?? []) {
    const name = `${c.first ?? ''} ${c.last ?? ''}`.trim();
    if (!name) continue;
    let slug = safeSlug(name);
    // Disambiguate duplicate slugs by appending the contact id suffix
    if (seenSlugs[slug]) {
      slug = `${slug}-${String(c.id).slice(-6)}`;
    }
    seenSlugs[slug] = true;
    const fileName = `${slug}.md`;
    const developerName = c.assignee_id ? devById[c.assignee_id] : null;
    const body = fmtBody(c, developerName);
    await writeFile(join(TARGET_DIR, fileName), body);
    wrote++;
  }

  console.log(`✓ Wrote ${wrote} BNI contact notes to ${TARGET_DIR}`);
  console.log('Next: npm run brain:obsidian   (ingest into brain)');
}

run().catch(e => { console.error(e); process.exit(1); });
