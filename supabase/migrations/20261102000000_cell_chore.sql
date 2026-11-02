-- Pressing a board cell adds a catalog deed on that cell's day and hands this week's card to that row's person.
-- The chore itself still repeats weekly; only the viewed week's card is placed, later weeks use the normal allocation.
-- All of it runs in one transaction, so a refused move (a day that has passed, a person who is not a housemate) leaves no chore behind.

-- Chores with no deed can no longer be created, and the Chores table that could remove them is gone: retire the old ones.
update public.chore set active = false where deed_id is null;

-- The clock is a parameter only for tests: this version is not callable by clients, the public one below passes now().
create function public.add_chore_to_cell_at(p_deed uuid, p_weekday int, p_member uuid, p_week_start date, p_now timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_chore uuid; v_instance uuid; v_local timestamp;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  v_local := p_now at time zone (select timezone from public.household where id = public.current_household());
  -- The chore repeats weekly, so it is also on this week's board: refuse a day of this week that has already passed,
  -- or the queue would hand out a card on a locked day (this also covers adding from the Next week view).
  if public.period_start('week', v_local)::date + p_weekday % 7 < v_local::date then
    raise exception 'this chore would start on a day that has passed' using errcode = '55000';
  end if;
  v_chore := public.add_chore_from_deed(p_deed, p_weekday); -- deed and day rules
  perform public.generate_week(p_week_start, p_now);        -- this week's card exists; refuses a week that is not this one or next
  select id into v_instance from public.chore_instance where chore_id = v_chore and week_start = p_week_start;
  perform public.assign_chore(v_instance, p_member, p_now); -- from today on, scored members only, null keeps it unassigned
  return v_instance;
end $$;
revoke execute on function public.add_chore_to_cell_at(uuid, int, uuid, date, timestamptz) from public, anon, authenticated;

create function public.add_chore_to_cell(p_deed uuid, p_weekday int, p_member uuid, p_week_start date) returns uuid
language sql security definer set search_path = '' as $$
  select public.add_chore_to_cell_at(p_deed, p_weekday, p_member, p_week_start, now())
$$;
