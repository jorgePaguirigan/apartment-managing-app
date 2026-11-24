-- activity() dates a claim's entry by the day the claim was submitted, not the day it was accepted, as streak() does;
-- awards keep their own day. The range and first_day use the same day. Security definer, because a housemate cannot read
-- another member's claim row (or one they are only a contributor on); every read stays pinned to the caller's household.
create or replace function public.activity(p_member uuid, p_view text, p_anchor date default null, p_now timestamptz default now(),
                                           p_step int default 0)
returns table (day date, weekday int, deeds int, points int, future boolean, today date, first_day date)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household();
  v_tz text; v_today date; v_anchor date; v_start date; v_end date; v_first date;
begin
  select h.timezone into v_tz from public.household h where h.id = v_household;
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  if p_view is null or p_view not in ('week', 'month', 'year', 'last_12_months') then
    raise exception 'unknown view' using errcode = '22023';
  end if;
  if not exists (select 1 from public.member m where m.user_id = p_member and m.household_id = v_household and m.scored) then
    raise exception 'not a housemate' using errcode = '22023';
  end if;

  v_today := (p_now at time zone v_tz)::date;
  v_anchor := coalesce(p_anchor, v_today);
  case p_view
    when 'week' then
      v_start := public.period_start('week', (v_anchor + 7 * p_step)::timestamp)::date; v_end := v_start + 6;
    when 'month' then
      v_start := date_trunc('month', v_anchor + make_interval(months => p_step))::date;
      v_end := (v_start + interval '1 month')::date - 1;
    when 'year' then
      v_start := date_trunc('year', v_anchor + make_interval(years => p_step))::date;
      v_end := (v_start + interval '1 year')::date - 1;
    else
      v_end := least((v_anchor + make_interval(years => p_step))::date, v_today);
      v_start := (v_end - interval '1 year')::date + 1;
  end case;

  select min((coalesce(c.created_at, e.created_at) at time zone v_tz)::date) into v_first
  from public.score_entry e left join public.claim c on c.id = e.claim_id
  where e.household_id = v_household and e.deleted_at is null;

  return query
    with e as (
      select (coalesce(c.created_at, s.created_at) at time zone v_tz)::date as d, s.points as p
      from public.score_entry s
      left join public.claim c on c.id = s.claim_id
      where s.household_id = v_household and s.member_id = p_member and s.points > 0 and s.deleted_at is null
        and s.created_at >= v_start::timestamp at time zone v_tz -- an entry is never created before its claim was submitted
    )
    select g::date, extract(dow from g)::int, count(e.d)::int, coalesce(sum(e.p), 0)::int,
           g::date > v_today, v_today, coalesce(v_first, v_today)
    from generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g
    left join e on e.d = g::date
    group by g order by g;
end $$;
