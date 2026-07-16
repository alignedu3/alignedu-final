alter table public.analyses
  add column if not exists teacher_feedback_rating smallint check (teacher_feedback_rating between 1 and 5),
  add column if not exists admin_feedback_rating smallint check (admin_feedback_rating between 1 and 5);
