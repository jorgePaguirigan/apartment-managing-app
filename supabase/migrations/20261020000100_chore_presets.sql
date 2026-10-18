-- Preset chores. New households get them from create_household; existing households without any chores get them now.
-- A chore has one weekday, so a chore on several days is several chores. Weights and deed points are defaults the admin can edit.
--   Cook dinner: every day, Sweep the floor: Mon Wed Fri, Laundry: Tue Thu Sat, Palengke: Saturday
create function public.seed_chores(p_household uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.deed (household_id, name, points, kind)
    select p_household, d.name, d.points, 'good'
    from (values ('Swept the floor', 2), ('Did the laundry', 3), ('Went to palengke', 3)) d (name, points)
    where not exists (select 1 from public.deed x where x.household_id = p_household and x.name = d.name);
  insert into public.chore (household_id, name, area, weekday, weight, deed_id)
    select p_household, c.name, c.area, c.day, c.weight,
           (select x.id from public.deed x where x.household_id = p_household and x.name = c.deed order by x.id limit 1)
    from (
      select 'Cook dinner' as name, 'Kitchen' as area, d as day, 2 as weight, 'Cooked dinner' as deed from generate_series(1, 7) d
      union all select 'Sweep the floor', 'Living room', d, 1, 'Swept the floor' from unnest(array[1, 3, 5]) d
      union all select 'Laundry', 'Laundry area', d, 2, 'Did the laundry' from unnest(array[2, 4, 6]) d
      union all select 'Palengke', 'Market', 6, 2, 'Went to palengke'
    ) c;
end $$;
revoke execute on function public.seed_chores(uuid) from public, anon, authenticated;

create or replace function public.create_household(
  p_name text, p_display_name text, p_timezone text default 'Asia/Manila'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  insert into public.household (name, timezone) values (p_name, p_timezone) returning id into v_id;
  insert into public.member (user_id, household_id, role, display_name)
    values (auth.uid(), v_id, 'admin', p_display_name);
  insert into public.deed (household_id, name, points, kind) values
    (v_id, 'Cleaned toilet', 5, 'good'),
    (v_id, 'Cooked dinner', 4, 'good'),
    (v_id, 'Washed own dishes', 1, 'good'),
    (v_id, 'Forgot to wash cup', -1, 'penalty'),
    (v_id, 'Messy room', -2, 'penalty');
  perform public.seed_chores(v_id);
  return v_id;
end $$;

select public.seed_chores(h.id) from public.household h
where not exists (select 1 from public.chore c where c.household_id = h.id);
