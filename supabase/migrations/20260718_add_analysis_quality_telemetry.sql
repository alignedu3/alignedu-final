alter table public.analysis_jobs
  add column if not exists quality_score integer check (quality_score between 0 and 100),
  add column if not exists quality_passed boolean,
  add column if not exists quality_issues jsonb not null default '[]'::jsonb;

create index if not exists analysis_jobs_quality_passed_idx
  on public.analysis_jobs(quality_passed);
