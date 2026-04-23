create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    initcap(replace(split_part(new.email, '@', 1), '.', ' ')),
    'teacher'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
