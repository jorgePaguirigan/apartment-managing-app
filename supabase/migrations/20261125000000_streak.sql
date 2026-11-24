-- The caller's day streak for the Home pill: days in a row, up to today, with a deed (a positive, non-deleted score entry),
-- in the household time zone. A claim's entry counts on the day the claim was submitted, so a late decision never breaks it.
-- Today with no deed yet keeps the run up to yesterday. p_now pins the clock for tests.
-- Security definer because a contributor cannot read the claim row their entry came from; it only ever reads the caller's own rows.
create function public.streak(p_now timestamptz default now())
returns table (days int, today_done boolean, today_waiting boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_household uuid := public.current_household();
  v_tz text; v_today date;
begin
  select h.timezone into v_tz from public.household h where h.id = v_household;
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  if not exists (select 1 from public.member m where m.user_id = v_me and m.household_id = v_household and m.scored) then
    raise exception 'not a housemate' using errcode = '22023';
  end if;
  v_today := (p_now at time zone v_tz)::date;

  return query
    with d as (
      select distinct (coalesce(c.created_at, s.created_at) at time zone v_tz)::date as day
      from public.score_entry s
      left join public.claim c on c.id = s.claim_id
      where s.household_id = v_household and s.member_id = v_me and s.points > 0 and s.deleted_at is null and s.created_at <= p_now
    ),
    run as (
      -- Counting back from the last day that can count, a day belongs to the run while it sits exactly n days before it.
      select d.day, row_number() over (order by d.day desc) as n from d where d.day <= v_today
    )
    select
      (select count(*)::int from run r
       where r.day = (case when exists (select 1 from d where d.day = v_today) then v_today else v_today - 1 end) - (r.n - 1)::int),
      exists (select 1 from d where d.day = v_today),
      exists (
        select 1 from public.claim c
        where c.household_id = v_household and c.status = 'pending' and (c.created_at at time zone v_tz)::date = v_today
          and (c.member_id = v_me or exists (select 1 from public.claim_contributor cc where cc.claim_id = c.id and cc.member_id = v_me)));
end $$;

revoke execute on function public.streak(timestamptz) from public, anon;
grant execute on function public.streak(timestamptz) to authenticated;
