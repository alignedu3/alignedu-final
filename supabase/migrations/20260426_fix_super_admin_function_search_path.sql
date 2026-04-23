create or replace function public.enforce_single_super_admin()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.role = 'super_admin'
     and lower(coalesce(new.email, '')) <> 'ryan@alignedu.net' then
    new.role := 'admin';
  end if;
  return new;
end;
$function$;
