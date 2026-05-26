-- Pricing & proposal intelligence — every quote, agreed price, invoice across all projects

create table if not exists brain_proposals (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null,
  client_name text,                  -- "Dr Shweta", "Bajaj Power", etc.
  vendor_name text,                  -- the OTHER party if Murali is the client
  description text not null,         -- what the price is for (e.g. "NeuroQ reverse engineering")
  amount numeric,                    -- the price
  currency text default 'INR',       -- INR | AED | USD | EUR
  unit text,                         -- one-time | monthly | annual | per-image | etc.
  status text not null default 'proposed',   -- proposed | revised | agreed | invoiced | paid | rejected | superseded
  source_type text not null,         -- email | meeting | diary | manual
  source_ref text,                   -- file path or URL
  quoted_date date,
  agreed_date date,
  due_date date,                     -- when payment/delivery expected
  notes text,
  supersedes uuid references brain_proposals(id),  -- if this revises a prior quote
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brain_proposals_project_idx on brain_proposals(project_tag);
create index if not exists brain_proposals_client_idx on brain_proposals(client_name);
create index if not exists brain_proposals_status_idx on brain_proposals(status);
create index if not exists brain_proposals_quoted_idx on brain_proposals(quoted_date);
