-- Add this to your Supabase SQL Editor when you're ready to onboard team members
-- Each team member needs (1) their Slack user ID and (2) their role.
-- Get Slack user ID: in Slack → click person → ⋯ → Copy member ID (starts with U)

create table if not exists brain_user_roles (
  slack_user_id  text primary key,
  display_name   text,
  role           text not null references brain_access_roles(role),
  added_at       timestamptz not null default now()
);

-- Example onboarding (replace with real IDs when ready):
-- insert into brain_user_roles (slack_user_id, display_name, role) values
--   ('U01ABCDEFGH', 'Caroline (COO)',    'coo'),
--   ('U02IJKLMNOP', 'Haritha (Sales)',   'sales_lead')
-- on conflict (slack_user_id) do update set role = excluded.role, display_name = excluded.display_name;
