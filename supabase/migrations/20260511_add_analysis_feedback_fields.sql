alter table if exists public.analyses
  add column if not exists teacher_feedback text,
  add column if not exists teacher_feedback_updated_at timestamptz,
  add column if not exists admin_feedback text,
  add column if not exists admin_feedback_updated_at timestamptz,
  add column if not exists admin_feedback_author_name text,
  add column if not exists admin_edited_result text,
  add column if not exists admin_edited_result_updated_at timestamptz,
  add column if not exists admin_edited_result_editor_name text;
