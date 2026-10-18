-- Medals are worked out from score entries each time they are read, not stored.
-- That keeps them correct when an admin deletes an entry, and needs no job to run at month end.
drop table public.medal;

-- Three rules (weeks start Monday in the household time zone; p_now pins the clock for tests):
--   mvp_month: top total in a finished month (ties share it, zero or less never wins)
--   streak:    at least one accepted claim in each of 4 or more weeks in a row
--   champion:  the only housemate to do a deed in two weeks in a row (latest per housemate and deed)
create function public.medals(p_now timestamptz default now())
returns table (member_id uuid, kind text, label text, period_start date)
language sql stable set search_path = '' as $$
  with h as (select timezone as tz from public.household where id = public.current_household()),
  e as (
    select s.member_id, s.deed_id, d.name as deed_name, s.points, s.source,
           date_trunc('week', s.created_at at time zone h.tz)::date as wk,
           date_trunc('month', s.created_at at time zone h.tz)::date as mo
    from public.score_entry s
    join public.deed d on d.id = s.deed_id
    cross join h
    where s.deleted_at is null and s.household_id = public.current_household() and s.created_at <= p_now
  ),
  month_totals as (select e.member_id, e.mo, sum(e.points) as pts from e group by e.member_id, e.mo),
  mvp as (
    select t.member_id, 'mvp_month'::text as kind, to_char(t.mo, 'FMMonth YYYY') || ' MVP' as label, t.mo as period_start
    from month_totals t
    where t.pts > 0
      and t.mo < (select date_trunc('month', p_now at time zone h.tz)::date from h)
      and t.pts = (select max(x.pts) from month_totals x where x.mo = t.mo)
  ),
  claim_weeks as (
    select distinct e.member_id, e.wk from e where e.source = 'claim'
  ),
  runs as (
    select c.member_id, c.wk,
           c.wk - (row_number() over (partition by c.member_id order by c.wk) * 7)::int as grp -- equal for consecutive weeks
    from claim_weeks c
  ),
  streak as (
    select r.member_id, 'streak'::text as kind, count(*)::text || '-week streak' as label, min(r.wk) as period_start
    from runs r group by r.member_id, r.grp having count(*) >= 4
  ),
  sole as (
    select e.deed_id, e.deed_name, e.wk, (array_agg(distinct e.member_id))[1] as member_id
    from e where e.points > 0
    group by e.deed_id, e.deed_name, e.wk
    having count(distinct e.member_id) = 1
  ),
  champion as (
    select distinct on (a.member_id, a.deed_id)
           a.member_id, 'champion'::text as kind, a.deed_name || ' champion' as label, b.wk as period_start
    from sole a
    join sole b on b.deed_id = a.deed_id and b.member_id = a.member_id and b.wk = a.wk + 7
    order by a.member_id, a.deed_id, b.wk desc
  )
  select * from mvp
  union all select * from streak
  union all select * from champion
  order by period_start desc, label
$$;

revoke execute on function public.medals(timestamptz) from public, anon;
grant execute on function public.medals(timestamptz) to authenticated;
