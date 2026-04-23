drop policy if exists "Admins can view managed teacher analyses" on public.analyses;
drop policy if exists "Teachers can insert their own analyses" on public.analyses;
drop policy if exists "Teachers can view their own analyses" on public.analyses;
drop policy if exists "Users can delete own analyses" on public.analyses;
drop policy if exists "Users can insert own analyses" on public.analyses;
drop policy if exists "Users can update own analyses" on public.analyses;
drop policy if exists "Users can view own analyses" on public.analyses;
drop policy if exists "admins can view assigned teacher analyses" on public.analyses;
drop policy if exists "users can insert own analyses" on public.analyses;
drop policy if exists "users can view own analyses" on public.analyses;

create policy "analyses_select_own_authenticated"
  on public.analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "analyses_insert_own_authenticated"
  on public.analyses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "analyses_update_own_authenticated"
  on public.analyses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "analyses_delete_own_authenticated"
  on public.analyses
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "analysis_usage_delete_own_authenticated" on public.analysis_usage;
drop policy if exists "analysis_usage_insert_own_authenticated" on public.analysis_usage;
drop policy if exists "analysis_usage_select_own_authenticated" on public.analysis_usage;
drop policy if exists "analysis_usage_update_own_authenticated" on public.analysis_usage;

create policy "analysis_usage_select_own_authenticated"
  on public.analysis_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "analysis_usage_insert_own_authenticated"
  on public.analysis_usage
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "analysis_usage_update_own_authenticated"
  on public.analysis_usage
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "analysis_usage_delete_own_authenticated"
  on public.analysis_usage
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "managed_admins_select_visible_to_linked_admins" on public.managed_admins;

create policy "managed_admins_select_visible_to_linked_admins"
  on public.managed_admins
  for select
  to authenticated
  using (
    (parent_admin_id = (select auth.uid()))
    or (child_admin_id = (select auth.uid()))
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'super_admin'
    )
  );

drop policy if exists "Admins can add managed teachers" on public.managed_teachers;
drop policy if exists "Admins can remove managed teachers" on public.managed_teachers;
drop policy if exists "Admins can view their managed teachers" on public.managed_teachers;

create policy "Admins can view their managed teachers"
  on public.managed_teachers
  for select
  to authenticated
  using (admin_id = (select auth.uid()));

create policy "Admins can add managed teachers"
  on public.managed_teachers
  for insert
  to authenticated
  with check (admin_id = (select auth.uid()));

create policy "Admins can remove managed teachers"
  on public.managed_teachers
  for delete
  to authenticated
  using (admin_id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "profiles_insert_own_authenticated" on public.profiles;
drop policy if exists "profiles_select_own_authenticated" on public.profiles;
drop policy if exists "profiles_update_own_authenticated" on public.profiles;

create policy "profiles_select_own_authenticated"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own_authenticated"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own_authenticated"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
