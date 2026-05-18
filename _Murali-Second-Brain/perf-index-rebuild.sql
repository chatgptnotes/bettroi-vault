-- Performance fix for brain_search timeout (13.8K+ rows, growing)
-- Run once in Supabase SQL Editor.
--
-- Two changes:
-- 1. Replace ivfflat (lists=100, built when table was empty) with HNSW.
--    HNSW gives sub-100ms queries at this scale and doesn't need rebuilds.
-- 2. Rewrite brain_search to branch on the wildcard project_filter case,
--    so the planner can actually use the vector index instead of falling
--    back to a sequential scan.

-- 1. Drop the old ivfflat index
drop index if exists brain_chunks_embedding_idx;

-- 2. Build HNSW index (better recall + faster at our scale)
--    m=16, ef_construction=64 are good defaults for ≤1M rows
create index brain_chunks_embedding_hnsw_idx
  on brain_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 3. Rewrite brain_search with two clean code paths
create or replace function brain_search(
  query_embedding vector(1536),
  project_filter  text[],
  off_limits_ok   boolean default false,
  match_count     int default 5
)
returns table (
  id          uuid,
  project_tag text,
  source_type text,
  source_ref  text,
  content     text,
  similarity  float,
  created_at  timestamptz
)
language plpgsql stable as $$
begin
  -- Wildcard path: no project filter so the HNSW index handles everything
  if project_filter = array['*'] then
    return query
      select
        c.id, c.project_tag, c.source_type, c.source_ref, c.content,
        1 - (c.embedding <=> query_embedding) as similarity,
        c.created_at
      from brain_chunks c
      where off_limits_ok or c.off_limits = false
      order by c.embedding <=> query_embedding
      limit match_count;
  else
    -- Filtered path: narrow first by project, then vector-order
    return query
      select
        c.id, c.project_tag, c.source_type, c.source_ref, c.content,
        1 - (c.embedding <=> query_embedding) as similarity,
        c.created_at
      from brain_chunks c
      where c.project_tag = any(project_filter)
        and (off_limits_ok or c.off_limits = false)
      order by c.embedding <=> query_embedding
      limit match_count;
  end if;
end;
$$;

-- 4. Refresh planner stats so the new index is used immediately
analyze brain_chunks;
