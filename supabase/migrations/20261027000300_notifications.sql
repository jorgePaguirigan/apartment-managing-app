-- Claim emails, part 1: the outbox. Nothing is sent here; rows wait in `notification` for the sender.
--   admin_claim:        a claim was submitted; one row per admin.
--   housemate_decision: a claim was accepted or rejected; one row per scored member, with the standings before and after.
-- The payload is a snapshot taken at the moment of the decision, so a later entry cannot change what an email says.

-- Leaderboard and medals take the household as an argument (a trigger has no signed-in user), and can leave one entry out
-- to show the standings just before it. The functions clients call keep their signatures and now wrap these.
create function public.leaderboard_for(p_household uuid, p_period text, p_now timestamptz, p_exclude uuid default null)
returns table (member_id uuid, display_name text, points bigint, rank bigint)
language plpgsql stable set search_path = '' as $$
declare
  v_tz text; v_unit text; v_step interval; v_start timestamp; v_from timestamptz; v_to timestamptz;
begin
  select h.timezone into v_tz from public.household h where h.id = p_household;
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  if p_period not in ('this_week', 'prev_week', 'this_month', 'prev_month') then
    raise exception 'unknown period' using errcode = '22023';
  end if;
  v_unit := case when p_period like '%week' then 'week' else 'month' end; -- date_trunc week starts Monday
  v_step := ('1 ' || v_unit)::interval;
  v_start := date_trunc(v_unit, p_now at time zone v_tz);
  if p_period like 'prev_%' then v_start := v_start - v_step; end if;
  v_from := v_start at time zone v_tz;
  v_to := (v_start + v_step) at time zone v_tz;
  return query
    select m.user_id, m.display_name,
           coalesce(sum(e.points), 0)::bigint,
           rank() over (order by coalesce(sum(e.points), 0) desc)
    from public.member m
    left join public.score_entry e
      on e.member_id = m.user_id and e.deleted_at is null and e.id is distinct from p_exclude
     and e.created_at >= v_from and e.created_at < v_to
    where m.household_id = p_household and m.scored
    group by m.user_id, m.display_name
    order by 4, m.display_name;
end $$;

create or replace function public.leaderboard(p_period text, p_now timestamptz default now())
returns table (member_id uuid, display_name text, points bigint, rank bigint)
language sql stable security definer set search_path = '' as $$
  select * from public.leaderboard_for(public.current_household(), p_period, p_now)
$$;

create function public.medals_for(p_household uuid, p_now timestamptz, p_exclude uuid default null)
returns table (member_id uuid, kind text, label text, period_start date)
language sql stable set search_path = '' as $$
  with h as (select timezone as tz from public.household where id = p_household),
  e as (
    select s.member_id, s.deed_id, coalesce(d.name, s.title) as deed_name, s.points, s.source,
           date_trunc('week', s.created_at at time zone h.tz)::date as wk,
           date_trunc('month', s.created_at at time zone h.tz)::date as mo
    from public.score_entry s
    left join public.deed d on d.id = s.deed_id
    cross join h
    where s.deleted_at is null and s.household_id = p_household and s.created_at <= p_now
      and s.id is distinct from p_exclude
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
  where exists (select 1 from public.member x where x.user_id = m.member_id and x.scored)
  order by m.period_start desc, m.label
$$;

create or replace function public.medals(p_now timestamptz default now())
returns table (member_id uuid, kind text, label text, period_start date)
language sql stable security definer set search_path = '' as $$
  select * from public.medals_for(public.current_household(), p_now)
$$;

revoke execute on function public.leaderboard_for(uuid, text, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.medals_for(uuid, timestamptz, uuid) from public, anon, authenticated;

-- Standings of one period before and after an entry, and who it overtook. Overtaken means strictly ahead before and
-- strictly behind after, so reaching a tie overtakes nobody.
create function public.period_snapshot(p_household uuid, p_period text, p_now timestamptz, p_entry uuid)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select * from public.leaderboard_for(p_household, p_period, p_now, p_entry)),
       a as (select * from public.leaderboard_for(p_household, p_period, p_now))
  select jsonb_build_object(
    'before', (select coalesce(jsonb_agg(jsonb_build_object('name', display_name, 'points', points, 'rank', rank)
                                         order by rank, display_name), '[]') from b),
    'after',  (select coalesce(jsonb_agg(jsonb_build_object('name', display_name, 'points', points, 'rank', rank)
                                         order by rank, display_name), '[]') from a),
    'overtaken', (select coalesce(jsonb_agg(jsonb_build_object('name', bv.display_name, 'by', bo.display_name)
                                            order by bv.display_name, bo.display_name), '[]')
                  from b bv
                  join a av on av.member_id = bv.member_id
                  join b bo on bo.member_id <> bv.member_id and bo.rank > bv.rank
                  join a ao on ao.member_id = bo.member_id and ao.rank < av.rank))
$$;

-- Medals gained and lost because of an entry. A streak that gets longer is the same medal, not a loss and a gain.
create function public.medal_changes(p_household uuid, p_now timestamptz, p_entry uuid)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select member_id, kind, label, case when kind = 'streak' then kind else label end as k
             from public.medals_for(p_household, p_now, p_entry)),
       a as (select member_id, kind, label, case when kind = 'streak' then kind else label end as k
             from public.medals_for(p_household, p_now))
  select jsonb_build_object(
    'gained', (select coalesce(jsonb_agg(jsonb_build_object('member', m.display_name, 'label', a.label)
                                         order by m.display_name, a.label), '[]')
               from a join public.member m on m.user_id = a.member_id
               where not exists (select 1 from b where b.member_id = a.member_id and b.kind = a.kind and b.k = a.k)),
    'lost',   (select coalesce(jsonb_agg(jsonb_build_object('member', m.display_name, 'label', b.label)
                                         order by m.display_name, b.label), '[]')
               from b join public.member m on m.user_id = b.member_id
               where not exists (select 1 from a where a.member_id = b.member_id and a.kind = b.kind and a.k = b.k)))
$$;
revoke execute on function public.period_snapshot(uuid, text, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.medal_changes(uuid, timestamptz, uuid) from public, anon, authenticated;

create table public.notification (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  kind text not null check (kind in ('admin_claim', 'housemate_decision')),
  claim_id uuid references public.claim (id) on delete cascade,
  recipient_id uuid not null references public.member (user_id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);
create index on public.notification (created_at) where sent_at is null;
-- Only the sender (service role) touches this table; it holds what is about to be emailed.
alter table public.notification enable row level security;
revoke all on public.notification from anon, authenticated;

-- A submitted claim: every admin of the household is emailed.
create function public.queue_admin_claim_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification (household_id, kind, claim_id, recipient_id, payload)
  select new.household_id, 'admin_claim', new.id, a.user_id,
         jsonb_build_object('housemate', m.display_name, 'chore', coalesce(d.name, new.title), 'points', d.points,
                            'note', new.note, 'custom', new.deed_id is null)
  from public.member a
  join public.member m on m.user_id = new.member_id
  left join public.deed d on d.id = new.deed_id
  where a.household_id = new.household_id and a.role = 'admin';
  return new;
end $$;
create trigger claim_notify_admins after insert on public.claim
  for each row execute function public.queue_admin_claim_notifications();
revoke execute on function public.queue_admin_claim_notifications() from public, anon, authenticated;

-- A decided claim: every scored member is emailed. p_entry is the score entry an acceptance created, null for a rejection.
create function public.queue_decision_notifications(p_claim uuid, p_entry uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_claim public.claim; v_actor text; v_chore text; v_payload jsonb; v_now timestamptz := now();
begin
  select * into v_claim from public.claim where id = p_claim;
  select display_name into v_actor from public.member where user_id = v_claim.member_id;
  v_chore := coalesce((select d.name from public.deed d where d.id = v_claim.deed_id), v_claim.title);
  if p_entry is null then
    v_payload := jsonb_build_object('status', 'rejected', 'actor', v_actor, 'chore', v_chore);
  else
    v_payload := jsonb_build_object(
      'status', 'accepted', 'actor', v_actor, 'chore', v_chore,
      'points', (select e.points from public.score_entry e where e.id = p_entry),
      'leaderboards', jsonb_build_object(
        'this_week', public.period_snapshot(v_claim.household_id, 'this_week', v_now, p_entry),
        'this_month', public.period_snapshot(v_claim.household_id, 'this_month', v_now, p_entry)),
      'medals', public.medal_changes(v_claim.household_id, v_now, p_entry));
  end if;
  insert into public.notification (household_id, kind, claim_id, recipient_id, payload)
  select v_claim.household_id, 'housemate_decision', p_claim, m.user_id, v_payload
  from public.member m where m.household_id = v_claim.household_id and m.scored;
end $$;
revoke execute on function public.queue_decision_notifications(uuid, uuid) from public, anon, authenticated;

-- decide_claim as before, plus one call at the end. Other ways a claim gets rejected (deleting a deed, removing a
-- housemate) do not go through here, so they send nothing.
create or replace function public.decide_claim(p_claim uuid, p_accept boolean, p_points int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claim; v_points int; v_entry uuid;
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
      values (v_claim.household_id, v_claim.member_id, v_claim.deed_id, v_claim.title, v_points, 'claim', p_claim, auth.uid())
      returning id into v_entry;
  end if;
  perform public.queue_decision_notifications(p_claim, v_entry);
end $$;
