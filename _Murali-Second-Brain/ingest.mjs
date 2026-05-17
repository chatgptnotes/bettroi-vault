// ingest.mjs — chunk, embed, and store any text into brain_chunks
// Usage: node _Murali-Second-Brain/ingest.mjs
// Or import ingestText() from other scripts

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHUNK_SIZE = 512;   // tokens approx — we use chars: 512 * 4 = ~2048 chars
const CHUNK_OVERLAP = 50; // chars overlap between chunks

// Off-limits folder names — any content from these goes in with off_limits=true
const OFF_LIMITS_FOLDERS = ['_private', 'hr', 'accounts', 'finance', 'salary'];

export async function ingestText({ text, project_tag = '_inbox', source_type, source_ref = '', metadata = {} }) {
  if (!text?.trim()) return { inserted: 0 };

  // Auto-flag off-limits content
  const off_limits = OFF_LIMITS_FOLDERS.some(f =>
    source_ref.toLowerCase().includes(`/${f}/`) ||
    project_tag.toLowerCase() === f
  ) || metadata.off_limits === true;

  const chunks = splitIntoChunks(text);

  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  const rows = chunks.map((content, i) => ({
    project_tag,
    source_type,
    source_ref,
    content,
    embedding: embeddings.data[i].embedding,
    off_limits,
    metadata,
  }));

  const { error } = await supabase.from('brain_chunks').insert(rows);
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);

  console.log(`✓ Ingested ${rows.length} chunk(s) — [${project_tag}] ${source_type}: ${source_ref || '(no ref)'}`);
  return { inserted: rows.length };
}

function splitIntoChunks(text) {
  const CHARS = CHUNK_SIZE * 4;
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHARS));
    start += CHARS - CHUNK_OVERLAP * 4;
  }
  return chunks.filter(c => c.trim().length > 0);
}

// ── Quick test when run directly ─────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  await ingestText({
    text: 'Test ingest: AdamritHMS billing module discussion. Decision: delay to June. Follow up with dev team next week.',
    project_tag: 'AdamritHMS',
    source_type: 'test',
    source_ref: 'manual-test',
    metadata: { date: new Date().toISOString() },
  });
  console.log('Test ingest complete. Check brain_chunks table in Supabase.');
}
