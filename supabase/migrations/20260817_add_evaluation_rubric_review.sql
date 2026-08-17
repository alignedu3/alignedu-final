alter table public.analyses
  add column if not exists rubric_id text,
  add column if not exists rubric_review jsonb;

comment on column public.analyses.rubric_id is
  'Optional evaluation framework used for an administrator observation.';

comment on column public.analyses.rubric_review is
  'Administrator-confirmed rubric ratings and notes. AI suggestions remain in the analysis narrative.';
