-- An admin who lives in the apartment can opt in as a housemate (O1). `scored` is the one flag every housemate rule reads.
alter table public.member add column also_housemate boolean not null default false;
alter table public.member add column scored boolean generated always as
  (role = 'housemate' or (role = 'admin' and also_housemate)) stored;

-- Every rule that picks housemates now reads `scored`. Rewritten in place so each function keeps its current body.
-- remove_housemate keeps `role = 'housemate'`: an admin cannot be removed.
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname <> 'remove_housemate' and pg_get_functiondef(p.oid) ~ 'role = ''housemate'''
  loop
    def := regexp_replace(pg_get_functiondef(f.oid), 'role = ''housemate''', 'scored', 'g');
    execute def;
  end loop;
end $$;

create function public.set_also_housemate(p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.member set also_housemate = p_on where user_id = auth.uid();
end $$;

revoke execute on function public.set_also_housemate(boolean) from public, anon;
grant execute on function public.set_also_housemate(boolean) to authenticated;
