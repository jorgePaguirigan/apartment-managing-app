-- The admin may edit the schedule from today on: a card on an earlier day is locked, today's and later days can move,
-- in this week and next. A card can also move to another day of its own week; only that week's card changes, the chore
-- keeps its weekday. chore_instance.weekday is that override (1 = Monday to 7 = Sunday, null = the chore's weekday).
alter table public.chore_instance add column weekday smallint check (weekday between 1 and 7);

-- Today in the household time zone, so clients never work out the date themselves.
create function public.schedule_today(p_now timestamptz default now()) returns date
language sql stable set search_path = '' as $$
  select (p_now at time zone h.timezone)::date from public.household h where h.id = public.current_household()
$$;

drop function public.assign_chore(uuid, uuid, timestamptz);
create function public.assign_chore(p_instance uuid, p_member uuid, p_now timestamptz default now(), p_weekday int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_tz text; v_today date; v_day date;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() for update;
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  v_today := (p_now at time zone v_tz)::date;
  v_day := v_i.week_start + coalesce(v_i.weekday, (select weekday from public.chore where id = v_i.chore_id)) % 7;
  if v_day < v_today or v_i.claim_id is not null then
    raise exception 'this chore can no longer move' using errcode = '55000';
  end if;
  if p_member is not null and not exists (
       select 1 from public.member where user_id = p_member and role = 'housemate' and household_id = v_i.household_id) then
    raise exception 'target must be a housemate in this household' using errcode = '22023';
  end if;
  if p_weekday is not null and (p_weekday not between 1 and 7 or v_i.week_start + p_weekday % 7 < v_today) then
    raise exception 'cannot move to a day that has passed' using errcode = '22023';
  end if;
  update public.chore_instance set assignee = p_member, source = case when p_member is null then null else 'admin' end,
    held_open = p_member is null, weekday = coalesce(p_weekday, weekday)
    where id = p_instance;
end $$;

-- The Home list shows each chore on the day it was moved to.
create function pg_temp.patch(p_name text, p_from text, p_to text) returns void language plpgsql as $$
declare v_oid oid; v_def text;
begin
  select p.oid into strict v_oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = p_name;
  v_def := pg_get_functiondef(v_oid);
  if position(p_from in v_def) = 0 then raise exception 'patch % not found in %', p_from, p_name; end if;
  execute replace(v_def, p_from, p_to);
end $$;
select pg_temp.patch('available_chores', 'i.week_start + c.weekday % 7', 'i.week_start + coalesce(i.weekday, c.weekday) % 7');
