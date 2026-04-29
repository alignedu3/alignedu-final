create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  submitted_by_user_id uuid,
  target_user_id uuid not null,
  observed_teacher_id uuid,
  observed_teacher_name text,
  grade text not null default '',
  subject text not null default '',
  book text not null default '',
  chapter text not null default '',
  audio_duration_seconds integer,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  progress_step text not null default 'Queued for analysis...',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  result text,
  transcript text,
  score integer,
  coverage_score integer,
  clarity_rating integer,
  engagement_level integer,
  assessment_quality integer,
  gaps_detected integer,
  analysis_id uuid references public.analyses(id) on delete set null,
  error text
);

create index if not exists analysis_jobs_target_user_id_idx on public.analysis_jobs(target_user_id);
create index if not exists analysis_jobs_submitted_by_user_id_idx on public.analysis_jobs(submitted_by_user_id);
create index if not exists analysis_jobs_status_idx on public.analysis_jobs(status);
create index if not exists analysis_jobs_created_at_idx on public.analysis_jobs(created_at desc);

alter table public.analysis_jobs enable row level security;
