create table if not exists public.managed_admins (
  id uuid primary key default gen_random_uuid(),
  parent_admin_id uuid not null references public.profiles(id) on delete cascade,
  child_admin_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_admin_id, child_admin_id),
  check (parent_admin_id <> child_admin_id)
);

create index if not exists managed_admins_parent_idx
  on public.managed_admins(parent_admin_id);

create index if not exists managed_admins_child_idx
  on public.managed_admins(child_admin_id);
