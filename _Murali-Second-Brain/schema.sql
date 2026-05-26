-- Run this once in Supabase SQL Editor
-- Dashboard → SQL Editor → paste → Run

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Brain chunks — all ingested content lives here
create table if not exists brain_chunks (
  id            uuid primary key default gen_random_uuid(),
  project_tag   text not null default '_inbox',
  source_type   text not null, -- 'fathom' | 'obsidian' | 'slack' | 'diary' | 'whatsapp'
  source_ref    text,          -- file path, URL, or Slack message permalink
  content       text not null,
  embedding     vector(1536),  -- OpenAI text-embedding-3-small
  off_limits    boolean not null default false,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- 3. Vector similarity search index
create index if not exists brain_chunks_embedding_idx
  on brain_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Fast lookups by project and source
create index if not exists brain_chunks_project_idx on brain_chunks (project_tag);
create index if not exists brain_chunks_source_idx  on brain_chunks (source_type);
create index if not exists brain_chunks_limits_idx  on brain_chunks (off_limits);

-- 5. Role-based access control for teachable twin (Phase D)
create table if not exists brain_access_roles (
  role              text primary key,
  allowed_projects  text[] not null default array['*'],
  blocked_tags      text[] not null default array[]::text[]
);

insert into brain_access_roles (role, allowed_projects, blocked_tags) values
  ('murali',     array['*'],                                        array[]::text[]),
  ('coo',        array['*'],                                        array['hr','salary','accounts','payments','private']),
  ('sales_lead', array['adamrit','hope','2men','client'],           array['hr','salary','accounts','payments','private','internal'])
on conflict (role) do nothing;

-- 6. Sync state — tracks last ingest timestamp per source
create table if not exists brain_sync_state (
  source      text primary key,
  last_synced timestamptz not null default '1970-01-01'
);

insert into brain_sync_state (source) values
  ('fathom'), ('obsidian'), ('slack')
on conflict (source) do nothing;

-- 7. Vector search function — used by the Slack bot
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
language sql stable as $$
  select
    id, project_tag, source_type, source_ref, content,
    1 - (embedding <=> query_embedding) as similarity,
    created_at
  from brain_chunks
  where
    (project_filter = array['*'] or project_tag = any(project_filter))
    and (off_limits_ok or off_limits = false)
  order by embedding <=> query_embedding
  limit match_count;
$$;
