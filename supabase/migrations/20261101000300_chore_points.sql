-- A chore has no weight of its own any more: its points are the points of its deed (0 when it has no deed).
-- Fair share, the order chores are handed out in and the load of a housemate all count those points.
-- Nothing is copied: a chore moves with its deed's points, and history is untouched (score entries keep their own points).

-- Rewritten in place so each function keeps its current body; every replacement must change something.
create or replace function pg_temp.patch(p_name text, p_from text, p_to text) returns void language plpgsql as $$
declare v_oid oid; v_def text;
begin
  select p.oid into strict v_oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = p_name;
  v_def := pg_get_functiondef(v_oid);
  if position(p_from in v_def) = 0 then raise exception 'patch % not found in %', p_from, p_name; end if;
  execute replace(v_def, p_from, p_to);
end $$;

select pg_temp.patch('generate_week', 'order by c.weight desc,', 'order by coalesce((select d.points from public.deed d where d.id = c.deed_id), 0) desc,');
select pg_temp.patch('generate_week', 'sum(c2.weight)', 'sum((select d.points from public.deed d where d.id = c2.deed_id))');
select pg_temp.patch('dib_chore', 'select weight into v_w from public.chore where id = v_i.chore_id;',
  'select coalesce((select d.points from public.deed d where d.id = c.deed_id), 0) into v_w from public.chore c where c.id = v_i.chore_id;');
select pg_temp.patch('dib_chore', 'sum(c.weight)', 'sum((select d.points from public.deed d where d.id = c.deed_id))');

drop function public.available_chores(timestamptz);
create function public.available_chores(p_now timestamptz default now())
returns table (instance_id uuid, week_start date, day date, name text, area text, points int)
language plpgsql set search_path = '' as $$
declare v_this date := public.schedule_week(0, p_now);
begin
  if v_this is null then return; end if; -- not in a household
  perform public.generate_week(v_this, p_now);
  perform public.generate_week(v_this + 7, p_now);
  return query
    select i.id, i.week_start, i.week_start + coalesce(i.weekday, c.weekday) % 7, c.name, c.area,
           coalesce((select d.points from public.deed d where d.id = c.deed_id), 0)
    from public.chore_instance i join public.chore c on c.id = i.chore_id
    where i.household_id = public.current_household() and i.assignee is null and c.active
      and i.week_start in (v_this, v_this + 7)
    order by 3, c.name;
end $$;
revoke execute on function public.available_chores(timestamptz) from public, anon;
grant execute on function public.available_chores(timestamptz) to authenticated;

drop function public.upsert_chore(uuid, text, text, int, int, uuid, boolean);
create function public.upsert_chore(
  p_id uuid, p_name text, p_area text, p_weekday int, p_deed uuid default null, p_active boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or p_weekday not between 1 and 7 then
    raise exception 'invalid chore' using errcode = '22023';
  end if;
  if p_deed is not null and not exists (
       select 1 from public.deed where id = p_deed and household_id = public.current_household() and kind = 'good') then
    raise exception 'deed not found' using errcode = 'P0002';
  end if;
  if p_id is null then
    insert into public.chore (household_id, name, area, weekday, deed_id, active)
      values (public.current_household(), trim(p_name), nullif(trim(p_area), ''), p_weekday, p_deed, p_active)
      returning id into v_id;
  else
    update public.chore set name = trim(p_name), area = nullif(trim(p_area), ''), weekday = p_weekday,
           deed_id = p_deed, active = p_active
      where id = p_id and household_id = public.current_household() returning id into v_id;
    if v_id is null then raise exception 'chore not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.seed_chores(p_household uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.deed (household_id, name, points, kind)
    select p_household, d.name, d.points, 'good'
    from (values ('Swept the floor', 2), ('Did the laundry', 3), ('Went to palengke', 3)) d (name, points)
    where not exists (select 1 from public.deed x where x.household_id = p_household and x.name = d.name);
  insert into public.chore (household_id, name, area, weekday, deed_id)
    select p_household, c.name, c.area, c.day,
           (select x.id from public.deed x where x.household_id = p_household and x.name = c.deed order by x.id limit 1)
    from (
      select 'Cook dinner' as name, 'Kitchen' as area, d as day, 'Cooked dinner' as deed from generate_series(1, 7) d
      union all select 'Sweep the floor', 'Living room', d, 'Swept the floor' from unnest(array[1, 3, 5]) d
      union all select 'Laundry', 'Laundry area', d, 'Did the laundry' from unnest(array[2, 4, 6]) d
      union all select 'Palengke', 'Market', 6, 'Went to palengke'
    ) c;
end $$;

alter table public.chore drop column weight;
