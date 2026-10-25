-- Housemates can dib (claim) an unassigned chore any time until its week ends, not only Thursday to Saturday before it.
-- The fair-share cap and Sunday allocation of whatever is left stay as they were.
create or replace function public.dib_window_open(p_week_start date, p_tz text, p_now timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select (p_now at time zone p_tz) < (p_week_start + 7)::timestamp
$$;

-- Releasing follows the same window, but not once the chore was marked done.
create or replace function public.undib_chore(p_instance uuid, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_tz text;
begin
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() and i.assignee = auth.uid() and i.source = 'dibs'
      and i.claim_id is null
    for update;
  if not found then raise exception 'dib not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  if not public.dib_window_open(v_i.week_start, v_tz, p_now) then
    raise exception 'dibs are closed' using errcode = '55000';
  end if;
  update public.chore_instance set assignee = null, source = null where id = p_instance;
end $$;

-- Unassigned chores this week and next, with their date in the household time zone, for the housemate's
-- "Available chores" list. Fills the two weeks in first, like the schedule page does.
create function public.available_chores(p_now timestamptz default now())
returns table (instance_id uuid, week_start date, day date, name text, area text, weight smallint)
language plpgsql set search_path = '' as $$
declare v_this date := public.schedule_week(0, p_now);
begin
  if v_this is null then return; end if; -- not in a household
  perform public.generate_week(v_this, p_now);
  perform public.generate_week(v_this + 7, p_now);
  return query
    select i.id, i.week_start, i.week_start + c.weekday - 1, c.name, c.area, c.weight
    from public.chore_instance i join public.chore c on c.id = i.chore_id
    where i.household_id = public.current_household() and i.assignee is null and c.active
      and i.week_start in (v_this, v_this + 7)
    order by 3, c.name;
end $$;

revoke execute on function public.available_chores(timestamptz) from public, anon;
grant execute on function public.available_chores(timestamptz) to authenticated;
