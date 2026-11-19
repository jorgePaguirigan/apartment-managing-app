-- One scored member's activity for the heatmap: every day of a week, month, year or the last 12 months in the household
-- time zone, with that day's deeds (entries with positive points) and their points. Penalties and deleted entries never count.
-- Runs as the caller, like member_history(), so row-level security decides who may read. today and first_day drive the arrows.
create function public.activity(p_member uuid, p_view text, p_anchor date default null, p_now timestamptz default now())
returns table (day date, weekday int, deeds int, points int, future boolean, today date, first_day date)
language plpgsql stable set search_path = '' as $$
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
    when 'week' then v_start := public.period_start('week', v_anchor::timestamp)::date; v_end := v_start + 6;
    when 'month' then v_start := date_trunc('month', v_anchor)::date; v_end := (v_start + interval '1 month')::date - 1;
    when 'year' then v_start := date_trunc('year', v_anchor)::date; v_end := (v_start + interval '1 year')::date - 1;
    else v_end := v_anchor; v_start := (v_anchor - interval '1 year')::date + 1;
  end case;

  select min((e.created_at at time zone v_tz)::date) into v_first
  from public.score_entry e where e.household_id = v_household and e.deleted_at is null;

  return query
    with e as (
      select (s.created_at at time zone v_tz)::date as d, s.points as p
      from public.score_entry s
      where s.household_id = v_household and s.member_id = p_member and s.points > 0 and s.deleted_at is null
        and s.created_at >= v_start::timestamp at time zone v_tz and s.created_at < (v_end + 1)::timestamp at time zone v_tz
    )
    select g::date, extract(dow from g)::int, count(e.d)::int, coalesce(sum(e.p), 0)::int,
           g::date > v_today, v_today, coalesce(v_first, v_today)
    from generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g
    left join e on e.d = g::date
    group by g order by g;
end $$;

revoke execute on function public.activity(uuid, text, date, timestamptz) from public, anon;
grant execute on function public.activity(uuid, text, date, timestamptz) to authenticated;
