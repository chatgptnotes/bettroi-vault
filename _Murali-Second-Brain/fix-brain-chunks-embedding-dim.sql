-- Fix: brain_chunks inserts failing with "different vector dimensions 1536 and 0"
-- Diagnosis (confirmed): all 65 stored rows are valid 1536-dim, and freshly
-- generated embeddings are 1536-dim, yet even a direct insert fails. The HNSW
-- vector index is corrupt (holds a phantom 0-dim entry). The fix is to rebuild
-- the index. Run this in the Supabase SQL Editor for the brain project (drmhope).

-- 1. (Optional sanity) dimensions present in the table — expect only 1536
select vector_dims(embedding) as dims, count(*)
from brain_chunks
group by 1
order by 1;

-- 2. Enforce a fixed dimension on the column (no-op if already vector(1536);
--    guarantees the index can be built and blocks any 0-dim value)
alter table brain_chunks
  alter column embedding type vector(1536);

-- 3. Rebuild the vector index from clean table data
drop index if exists brain_chunks_embedding_hnsw_idx;
drop index if exists brain_chunks_embedding_idx;
create index brain_chunks_embedding_hnsw_idx
  on brain_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Refresh planner stats
analyze brain_chunks;
