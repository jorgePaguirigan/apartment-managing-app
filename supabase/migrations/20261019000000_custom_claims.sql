-- Custom claims: a housemate describes a deed that is not in the catalog; the admin sets its points when accepting.
-- A claim or entry has either a catalog deed or a free-text title, never both.
alter table public.claim alter column deed_id drop not null;
alter table public.claim add column title text;
alter table public.claim add constraint claim_deed_or_title check ((deed_id is null) <> (title is null));
alter table public.claim add constraint claim_title_length check (title is null or char_length(title) between 1 and 80);
create unique index claim_pending_custom_unique on public.claim (member_id, lower(title))
  where status = 'pending' and title is not null;

alter table public.score_entry alter column deed_id drop not null;
alter table public.score_entry add column title text;
alter table public.score_entry add constraint score_entry_deed_or_title check ((deed_id is null) <> (title is null));

create function public.submit_custom_claim(p_title text, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_title text := btrim(coalesce(p_title, '')); v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and role = 'housemate') then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  insert into public.claim (household_id, member_id, title, note)
    values (public.current_household(), auth.uid(), v_title, p_note) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already waiting for approval' using errcode = '55000';
end $$;

-- Accepting a custom claim needs points from the admin (positive: penalties stay admin-entered). Catalog claims keep catalog points.
drop function public.decide_claim(uuid, boolean);
create function public.decide_claim(p_claim uuid, p_accept boolean, p_points int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claim; v_points int;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into v_claim from public.claim
    where id = p_claim and household_id = public.current_household() for update;
  if not found then raise exception 'claim not found' using errcode = 'P0002'; end if;
  if v_claim.status <> 'pending' then raise exception 'claim already decided' using errcode = '55000'; end if;
  if p_accept and v_claim.deed_id is null and coalesce(p_points, 0) <= 0 then
    raise exception 'points must be positive' using errcode = '22023';
  end if;
  if p_points is not null and v_claim.deed_id is not null then
    raise exception 'catalog claims use catalog points' using errcode = '22023';
  end if;
  update public.claim
    set status = case when p_accept then 'accepted' else 'rejected' end,
        decided_by = auth.uid(), decided_at = now()
    where id = p_claim;
  if p_accept then
    if v_claim.deed_id is null then
      v_points := p_points;
    else
      select points into v_points from public.deed where id = v_claim.deed_id;
    end if;
    insert into public.score_entry (household_id, member_id, deed_id, title, points, source, claim_id, approved_by)
      values (v_claim.household_id, v_claim.member_id, v_claim.deed_id, v_claim.title, v_points, 'claim', p_claim, auth.uid());
  end if;
end $$;

-- Medals: custom entries count toward totals and streaks but never make a champion (no deed to be champion of).
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
  select * from mvp
  union all select * from streak
  union all select * from champion
  order by period_start desc, label
$$;

revoke execute on function public.medals(timestamptz) from public, anon;
grant execute on function public.medals(timestamptz) to authenticated;

revoke execute on function public.submit_custom_claim(text, text), public.decide_claim(uuid, boolean, int) from public, anon;
grant execute on function public.submit_custom_claim(text, text), public.decide_claim(uuid, boolean, int) to authenticated;
