-- A housemate may claim the same deed (or the same custom title) again while one claim still waits, e.g. sweeping twice
-- in a day. Each claim is still decided on its own. The one-waiting limit is gone, so is its error.
drop index public.claim_pending_unique;
drop index public.claim_pending_custom_unique;

create or replace function public.submit_claim(p_deed uuid, p_note text default null, p_contributors uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_deed public.deed; v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and scored) then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  select * into v_deed from public.deed where id = p_deed and household_id = public.current_household();
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  if not v_deed.active then raise exception 'deed is inactive' using errcode = '22023'; end if;
  if v_deed.kind <> 'good' then
    raise exception 'only good deeds can be claimed' using errcode = '22023';
  end if;
  perform public.check_contributors(auth.uid(), p_contributors);
  insert into public.claim (household_id, member_id, deed_id, note)
    values (v_deed.household_id, auth.uid(), p_deed, p_note) returning id into v_id;
  perform public.add_contributors(v_id, p_contributors);
  return v_id;
end $$;

create or replace function public.submit_custom_claim(p_title text, p_note text default null, p_contributors uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_title text := btrim(coalesce(p_title, '')); v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and scored) then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  perform public.check_contributors(auth.uid(), p_contributors);
  insert into public.claim (household_id, member_id, title, note)
    values (public.current_household(), auth.uid(), v_title, p_note) returning id into v_id;
  perform public.add_contributors(v_id, p_contributors);
  return v_id;
end $$;

-- A chore card may be claimed again. The card keeps pointing at its first claim (that one drives its status and the queue)
-- until that one is rejected; later claims are ordinary claims.
create or replace function public.complete_chore(p_instance uuid, p_note text default null, p_now timestamptz default now())
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_deed uuid; v_tz text; v_claim uuid;
begin
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() and i.assignee = auth.uid() for update;
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  if (p_now at time zone v_tz)::date < v_i.week_start then raise exception 'week has not started' using errcode = '55000'; end if;
  select deed_id into v_deed from public.chore where id = v_i.chore_id;
  if v_deed is null then raise exception 'chore has no deed to claim' using errcode = '22023'; end if;
  v_claim := public.submit_claim(v_deed, p_note);
  if v_i.claim_id is null or exists (select 1 from public.claim where id = v_i.claim_id and status = 'rejected') then
    update public.chore_instance set claim_id = v_claim where id = p_instance;
  end if;
  return v_claim;
end $$;
