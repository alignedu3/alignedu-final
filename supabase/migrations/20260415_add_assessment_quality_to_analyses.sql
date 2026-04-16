alter table if exists public.analyses
  add column if not exists assessment_quality integer;
