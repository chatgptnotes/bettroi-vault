-- Action items tracker — extracted from Fathom meetings, Slack threads, diary entries

create table if not exists brain_action_items (
  id uuid primary key default gen_random_uuid(),
  item_text text not null,
  assignee text,                  -- name as written ("Sahil", "BT", "Dr Murali")
  assignee_user_id text,          -- resolved Slack user id (filled later by matcher)
  due_date date,
  status text not null default 'open',     -- open | done | overdue | cancelled
  priority text,                  -- high | medium | low
  source_type text not null,      -- fathom | slack | diary | manual
  source_ref text,                -- meeting URL, slack permalink, file path
  project_tag text,
  meeting_date date,              -- date the meeting/note was created
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  resolved_at timestamptz,
  unique (item_text, source_ref)  -- prevent dupes from re-extraction
);

create index if not exists brain_action_items_status_idx on brain_action_items(status);
create index if not exists brain_action_items_assignee_idx on brain_action_items(assignee_user_id);
create index if not exists brain_action_items_due_idx on brain_action_items(due_date);
create index if not exists brain_action_items_project_idx on brain_action_items(project_tag);
