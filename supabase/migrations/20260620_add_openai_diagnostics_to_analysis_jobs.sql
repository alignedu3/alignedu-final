alter table public.analysis_jobs
  add column if not exists openai_api_path text,
  add column if not exists openai_model text,
  add column if not exists openai_attempt_count integer not null default 0,
  add column if not exists openai_fallback_used boolean not null default false,
  add column if not exists openai_fallback_reason text;
