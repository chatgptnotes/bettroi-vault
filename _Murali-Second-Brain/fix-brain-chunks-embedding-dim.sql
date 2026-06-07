-- Fix: brain_chunks inserts failing with "different vector dimensions 1536 and 0"
-- Cause: one or more rows hold a malformed (non-1536) embedding, which poisons the
-- HNSW vector index so EVERY new insert fails. Run this in the Supabase SQL Editor
-- for the brain project. Safe: only removes malformed rows.

-- 1. Inspect — how many rows per embedding dimension? (expect mostly 1536, plus a few bad)
select vector_dims(embedding) as dims, count(*)
from brain_chunks
group by 1
order by 1;

-- 2. Remove malformed rows (null or not 1536-dim)
delete from brain_chunks
where embedding is null
   or vector_dims(embedding) <> 1536;

-- 3. Enforce the dimension on the column so a 0-dim vector can never get back in
alter table brain_chunks
  alter column embedding type vector(1536);

-- 4. Rebuild the vector index + refresh planner stats
reindex table brain_chunks;
analyze brain_chunks;
