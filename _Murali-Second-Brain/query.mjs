// query.mjs — search brain_chunks and synthesize an answer with Claude
// Usage: node --env-file=.env.local _Murali-Second-Brain/query.mjs "your question"

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { callClaude } from './ai-client.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getRole(role = 'murali') {
  const { data } = await supabase
    .from('brain_access_roles')
    .select('allowed_projects, blocked_tags')
    .eq('role', role)
    .single();
  return data ?? { allowed_projects: ['*'], blocked_tags: [] };
}

export async function queryBrain({ question, role = 'murali' }) {
  // 1. Embed the question
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const queryEmbedding = embed.data[0].embedding;

  // 2. Get role permissions
  const { allowed_projects, blocked_tags } = await getRole(role);

  // 3. Vector search via Supabase function
  const { data: chunks, error } = await supabase.rpc('brain_search', {
    query_embedding: queryEmbedding,
    project_filter: allowed_projects,
    off_limits_ok: role === 'murali',
    match_count: 6,
  });
  if (error) throw new Error(`Search failed: ${error.message}`);
  if (!chunks?.length) return { answer: "I don't have any relevant information for that question.", sources: [] };

  // 4. Build context from chunks
  const context = chunks.map((c, i) =>
    `[Source ${i + 1}] Project: ${c.project_tag} | Type: ${c.source_type} | Ref: ${c.source_ref}\n${c.content}`
  ).join('\n\n---\n\n');

  // 5. Synthesize with Claude
  const msg = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are Murali's second brain — his personal knowledge assistant.

Murali asked you something. Below are the most relevant chunks pulled from his knowledge base. Your job: ANSWER his question using whatever is in these sources. Be generous, not cautious.

Hard rules:
- ALWAYS attempt an answer using the sources. Synthesize across multiple chunks.
- Treat the sources as Murali's own knowledge — he wrote them. So if it's there, it's true.
- Cite sources you use as [Source N].
- If the sources are tangentially related, USE them — say what they tell you, then note any gaps.
- NEVER refuse, hedge, or give meta-commentary about retrieval, indexing, or your process.
- NEVER say "I don't have that information" unless the sources are completely unrelated to the question.
- Default to being helpful and direct, not defensive.
- No preamble. Just answer.

Question: ${question}

Sources:
${context}

Answer:`
    }]
  });

  const answer = msg.content[0].text;
  const sources = chunks.map(c => `${c.source_type}: ${c.source_ref} (${c.project_tag})`);

  return { answer, sources };
}

// ── CLI mode ──────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const question = process.argv.slice(2).join(' ');
  if (!question) { console.log('Usage: node query.mjs "your question"'); process.exit(0); }

  console.log(`\nAsking: "${question}"\n`);
  const { answer, sources } = await queryBrain({ question });
  console.log('Answer:\n', answer);
  console.log('\nSources:');
  sources.forEach((s, i) => console.log(`  [${i+1}] ${s}`));
}
