alter table public.analysis_usage enable row level security;

create policy "analysis_usage_select_own_authenticated"
  on public.analysis_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "analysis_usage_insert_own_authenticated"
  on public.analysis_usage
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "analysis_usage_update_own_authenticated"
  on public.analysis_usage
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "analysis_usage_delete_own_authenticated"
  on public.analysis_usage
  for delete
  to authenticated
  using (auth.uid() = user_id);
