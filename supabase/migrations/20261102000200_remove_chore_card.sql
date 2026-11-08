-- The red X on a schedule card removes its chore for good (remove_chore: it stops repeating every week). The admin may
-- remove any card; a housemate only their own. Like moving a card, it is refused once the card's day has passed or the
-- card has been claimed.
create function public.remove_chore_card_at(p_instance uuid, p_now timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_day date;
begin
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() for update;
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
  if not public.is_admin() and v_i.assignee is distinct from auth.uid() then
    raise exception 'not your chore' using errcode = '42501';
  end if;
  v_day := v_i.week_start + coalesce(v_i.weekday, (select weekday from public.chore where id = v_i.chore_id)) % 7;
  if v_day < (p_now at time zone (select timezone from public.household where id = v_i.household_id))::date or v_i.claim_id is not null then
    raise exception 'this chore can no longer be removed' using errcode = '55000';
  end if;
  update public.chore set active = false where id = v_i.chore_id;
end $$;
revoke execute on function public.remove_chore_card_at(uuid, timestamptz) from public, anon, authenticated;

create function public.remove_chore_card(p_instance uuid) returns void
language sql security definer set search_path = '' as $$
  select public.remove_chore_card_at(p_instance, now())
$$;
revoke execute on function public.remove_chore_card(uuid) from public, anon;
grant execute on function public.remove_chore_card(uuid) to authenticated;
