alter table public.analyses
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_user_id uuid;

create index if not exists analyses_active_user_created_idx
  on public.analyses(user_id, created_at desc)
  where deleted_at is null;

comment on column public.analyses.deleted_at is
  'Soft-delete timestamp. Deleted lessons remain available to super-admin monitoring but are excluded from instructional dashboards.';

comment on column public.analyses.deleted_by_user_id is
  'Authenticated user who removed the lesson from instructional dashboards.';
