alter table public.managed_admins enable row level security;

drop policy if exists "managed_admins_select_visible_to_linked_admins" on public.managed_admins;
create policy "managed_admins_select_visible_to_linked_admins"
  on public.managed_admins
  for select
  to authenticated
  using (
    parent_admin_id = auth.uid()
    or child_admin_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'super_admin'
    )
  );
