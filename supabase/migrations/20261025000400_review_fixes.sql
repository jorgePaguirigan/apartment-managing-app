-- Review fixes for this batch.

-- 1. Releasing a dibbed chore stops at Sunday's handout. Otherwise a housemate could release mid-week and the next
--    generate_week would give the chore to someone else. Claiming stays open until the week ends.
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
  if (p_now at time zone v_tz) >= (v_i.week_start - 1)::timestamp then
    raise exception 'too late to release' using errcode = '55000';
  end if;
  update public.chore_instance set assignee = null, source = null where id = p_instance;
end $$;

-- 2. Removed housemates keep their history but show no medals. They still count in the contest, so nobody
--    inherits an MVP they earned.
create or replace function public.medals(p_now timestamptz default now())
returns table (member_id uuid, kind text, label text, period_start date)
language sql stable set search_path = '' as $$
  with h as (select timezone as tz from public.household where id = public.current_household()),
  e as (
    select s.member_id, s.deed_id, coalesce(d.name, s.title) as deed_name, s.points, s.source,
           date_trunc('week', s.created_at at time zone h.tz)::date as wk,
           date_trunc('month', s.created_at at time zone h.tz)::date as mo
    from public.score_entry s
    left join public.deed d on d.id = s.deed_id
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
    from e where e.points > 0 and e.deed_id is not null
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
  select m.* from (
    select * from mvp
    union all select * from streak
    union all select * from champion
  ) m
  where exists (select 1 from public.member x where x.user_id = m.member_id and x.role = 'housemate')
  order by m.period_start desc, m.label
$$;
