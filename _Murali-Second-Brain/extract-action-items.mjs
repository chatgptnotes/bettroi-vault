// extract-action-items.mjs — scan Fathom + diary chunks for action items
// Usage: node --env-file=.env.local _Murali-Second-Brain/extract-action-items.mjs

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractItems({ text, sourceRef, projectTag, meetingDate }) {
  const sys = `Extract action items from the meeting/diary notes below.

An action item is a SPECIFIC TASK someone agreed to do (not just a topic discussed).
Examples of good action items:
- "Sahil will fix the signature workflow bug by Friday"
- "BT to revise the Bajaj proposal"
- "Send the OPEX document to Dr. Shweta"

Skip vague statements ("we should think about X"). Only concrete commitments.

Output ONLY valid JSON in this exact shape — NO commentary:
{"items":[{"item_text":"<the task>","assignee":"<name or null>","due_date":"<YYYY-MM-DD or null>","priority":"<high|medium|low or null>"},...]}

If no real action items, output: {"items":[]}`;

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: sys,
      messages: [{ role: 'user', content: text.slice(0, 6000) }],
    });
    const m = res.content[0].text.match(/\{[\s\S]*\}/);
    if (!m) return [];
    return (JSON.parse(m[0]).items ?? []).map(item => ({
      item_text: item.item_text?.slice(0, 500),
      assignee: item.assignee?.slice(0, 100) ?? null,
      due_date: item.due_date,
      priority: item.priority,
      source_type: 'fathom',
      source_ref: sourceRef,
      project_tag: projectTag,
      meeting_date: meetingDate,
      status: 'open',
    })).filter(i => i.item_text);
  } catch (e) {
    console.warn(`  ⚠ extract failed: ${e.message}`);
    return [];
  }
}

async function run() {
  // Pull all Fathom meeting chunks (meetings only, not other markdown)
  const { data: chunks, error } = await supabase
    .from('brain_chunks')
    .select('content, source_ref, project_tag, metadata')
    .like('source_ref', '%/meetings/%')
    .eq('source_type', 'obsidian');
  if (error) { console.error(error); process.exit(1); }

  // Group chunks back into meetings (one entry per source_ref)
  const meetings = {};
  for (const c of chunks) {
    if (!meetings[c.source_ref]) {
      meetings[c.source_ref] = {
        text: '',
        project_tag: c.project_tag,
        meeting_date: c.metadata?.date?.slice(0, 10) ?? null,
      };
    }
    meetings[c.source_ref].text += c.content + '\n\n';
  }

  const entries = Object.entries(meetings);
  console.log(`Scanning ${entries.length} meetings for action items...`);

  let totalItems = 0;
  let processed = 0;
  for (const [ref, m] of entries) {
    const items = await extractItems({ text: m.text, sourceRef: ref, projectTag: m.project_tag, meetingDate: m.meeting_date });
    if (items.length) {
      const { error: insErr } = await supabase
        .from('brain_action_items')
        .upsert(items, { onConflict: 'item_text,source_ref', ignoreDuplicates: true });
      if (insErr) {
        console.warn(`  ✗ insert failed for ${ref}: ${insErr.message}`);
      } else {
        totalItems += items.length;
        process.stdout.write('.');
      }
    } else {
      process.stdout.write('·');
    }
    processed++;
    if (processed % 50 === 0) process.stdout.write(` ${processed}/${entries.length}\n`);
  }

  console.log(`\n\n✓ Extracted ${totalItems} action items from ${entries.length} meetings.`);

  // Print summary by status
  const { data: summary } = await supabase.rpc('brain_action_items_summary').single().select();
  const { data: byStatus } = await supabase.from('brain_action_items').select('status, project_tag');
  if (byStatus) {
    const counts = {};
    byStatus.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
    console.log('\nBy status:', counts);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
