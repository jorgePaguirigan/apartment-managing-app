-- Pressing a board cell adds a catalog deed on that cell's day and hands this week's card to that row's person.
-- The chore itself still repeats weekly; only the viewed week's card is placed, later weeks use the normal allocation.
-- All of it runs in one transaction, so a refused move (a day that has passed, a person who is not a housemate) leaves no chore behind.
create function public.add_chore_to_cell(p_deed uuid, p_weekday int, p_member uuid, p_week_start date, p_now timestamptz default now()) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_chore uuid; v_instance uuid;
begin
  v_chore := public.add_chore_from_deed(p_deed, p_weekday); -- admin only, deed and day rules
  perform public.generate_week(p_week_start, p_now);        -- this week's card exists; refuses a week that is not this one or next
  select id into v_instance from public.chore_instance where chore_id = v_chore and week_start = p_week_start;
  perform public.assign_chore(v_instance, p_member, p_now); -- from today on, scored members only, null keeps it unassigned
  return v_instance;
end $$;
