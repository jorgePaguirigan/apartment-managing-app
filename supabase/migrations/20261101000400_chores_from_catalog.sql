-- The schedule is built from the deed catalog: an admin adds a catalog deed on a day and removes it again.
-- The chore takes its name from the deed and its area from the deed's group. A chore removed and added back on the
-- same day is the same chore, so its queue history (who did it last) is kept.
drop function public.upsert_chore(uuid, text, text, int, uuid, boolean);

create function public.add_chore_from_deed(p_deed uuid, p_weekday int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_hh uuid := public.current_household(); v_deed public.deed; v_area text; v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_weekday not between 1 and 7 then raise exception 'invalid weekday' using errcode = '22023'; end if;
  select * into v_deed from public.deed where id = p_deed and household_id = v_hh and kind = 'good' and active;
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.chore where household_id = v_hh and deed_id = p_deed and weekday = p_weekday and active) then
    raise exception 'already on the schedule' using errcode = '55000';
  end if;
  select g.name into v_area from public.deed_group g where g.id = v_deed.group_id and g.household_id = v_hh;
  update public.chore set name = v_deed.name, area = v_area, active = true
    where household_id = v_hh and deed_id = p_deed and weekday = p_weekday returning id into v_id;
  if v_id is null then
    insert into public.chore (household_id, name, area, weekday, deed_id) values (v_hh, v_deed.name, v_area, p_weekday, p_deed)
      returning id into v_id;
  end if;
  return v_id;
end $$;

-- Chores are deactivated, never deleted: past weeks and the queue keep pointing at them.
create function public.remove_chore(p_chore uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.chore set active = false where id = p_chore and household_id = public.current_household();
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
end $$;
