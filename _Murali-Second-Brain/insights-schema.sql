-- Cross-project intelligence — patterns, contradictions, reuse opportunities

create table if not exists brain_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null,        -- 'recurring' | 'contradiction' | 'reuse' | 'risk' | 'pattern'
  title text not null,
  description text not null,
  evidence jsonb,                    -- array of {project, date, quote, source_ref}
  projects text[],                   -- list of project tags this insight spans
  severity text default 'info',      -- 'high' | 'medium' | 'low' | 'info'
  status text default 'new',         -- 'new' | 'acknowledged' | 'actioned' | 'dismissed'
  recommended_action text,
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (insight_type, title)       -- prevents re-detecting same insight
);

create index if not exists brain_insights_status_idx on brain_insights(status);
create index if not exists brain_insights_severity_idx on brain_insights(severity);
create index if not exists brain_insights_detected_idx on brain_insights(detected_at desc);
