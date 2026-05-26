-- Remembers the order of action items most recently shown to each user
-- So bot commands "done 3" / "snooze 3 2026-05-20" can resolve to the right item

create table if not exists brain_user_state (
  slack_user_id text primary key,
  last_items_dm uuid[],          -- ordered list of brain_action_items.id values
  updated_at timestamptz not null default now()
);
