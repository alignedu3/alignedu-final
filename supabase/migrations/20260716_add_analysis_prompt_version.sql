alter table public.analysis_jobs
  add column if not exists prompt_version text;

create index if not exists analysis_jobs_prompt_version_idx
  on public.analysis_jobs(prompt_version);
