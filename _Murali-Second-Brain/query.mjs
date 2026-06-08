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
  // 1. Get role permissions
  const { allowed_projects, blocked_tags } = await getRole(role);

  // 2. Pre-filter: refuse questions that match blocked_tags before search runs.
  // Keeps team members from probing salary/HR/accounts/payments even if those
  // chunks aren't tagged off_limits.
  if (blocked_tags?.length) {
    const lc = question.toLowerCase();
    const hit = blocked_tags.find(tag => lc.includes(tag.toLowerCase()));
    if (hit) {
      return {
        answer: `That topic ("${hit}") is outside what I can share. Ask Murali directly.`,
        sources: [],
        refused: true,
      };
    }
  }

  // 3. Embed the question
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const queryEmbedding = embed.data[0].embedding;

  // 4. Vector search via Supabase function
  let { data: chunks, error } = await supabase.rpc('brain_search', {
    query_embedding: queryEmbedding,
    project_filter: allowed_projects,
    off_limits_ok: role === 'murali',
    match_count: 18,                          // fetch a wider candidate pool, then re-rank
  });
  if (error) throw new Error(`Search failed: ${error.message}`);
  if (!chunks?.length) return { answer: "I don't have any relevant information for that question.", sources: [] };

  // Re-rank candidates: blend semantic similarity with recency + keyword overlap, then
  // enforce source diversity (≤2 chunks per source_ref). Pure vector ranking missed
  // recent and exact-term matches (e.g. ranked the to-do digest over actual meeting
  // notes). No LLM needed — works even while the primary brain is out of credits.
  {
    const kw = [...new Set((question.toLowerCase().match(/[a-z0-9]{4,}/g) || []))];
    const now = Date.now();
    const scored = chunks.map(c => {
      const ageDays = c.created_at ? (now - new Date(c.created_at).getTime()) / 8.64e7 : 365;
      const recency = Math.exp(-ageDays / 45);                                   // ~0..1, newer ranks higher
      const lc = (c.content || '').toLowerCase();
      const kwHits = kw.length ? kw.filter(w => lc.includes(w)).length / kw.length : 0;
      // Semantic similarity leads; recency + keyword overlap only break near-ties.
      return { c, score: (c.similarity ?? 0) + 0.06 * recency + 0.05 * kwHits };
    }).sort((a, b) => b.score - a.score);
    // Diversity: ≤2 chunks per source_ref AND ≤4 per source_type, so one kind of
    // document can't crowd out the rest. Backfill if diversity caps leave us short.
    const picked = [], perRef = {}, perType = {};
    for (const pass of [true, false]) {
      for (const { c } of scored) {
        if (picked.includes(c)) continue;
        if (pass && ((perRef[c.source_ref] || 0) >= 2 || (perType[c.source_type] || 0) >= 4)) continue;
        perRef[c.source_ref] = (perRef[c.source_ref] || 0) + 1;
        perType[c.source_type] = (perType[c.source_type] || 0) + 1;
        picked.push(c);
        if (picked.length >= 8) break;
      }
      if (picked.length >= 8) break;
    }
    chunks = picked;
  }

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

  let answer = msg.content[0].text;
  const sources = chunks.map(c => `${c.source_type}: ${c.source_ref} (${c.project_tag})`);

  // Team members get a confidence footer — Murali's own queries don't need it.
  if (role !== 'murali') {
    const avgSim = chunks.reduce((s, c) => s + (c.similarity ?? 0), 0) / chunks.length;
    const confidence = avgSim > 0.78 ? 'High' : avgSim > 0.65 ? 'Medium' : 'Low';
    answer += `\n\n_Confidence: ${confidence} — verify with Murali for decisions._`;
  }

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
