alter table public.profiles enable row level security;

drop policy if exists "Allow read access to profiles" on public.profiles;
drop policy if exists "Allow admin insert" on public.profiles;
drop policy if exists "Allow insert via trigger" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;

create policy "profiles_select_own_authenticated"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own_authenticated"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own_authenticated"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
