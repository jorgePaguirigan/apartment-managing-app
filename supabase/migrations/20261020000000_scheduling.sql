-- v2 scheduling. Chores recur weekly on a fixed weekday; each week gets one instance per chore.
-- Who does what is decided by dibs first, then by a per-chore queue worked out from history (never stored).
-- Clients only read these tables; every write goes through the functions below.

create table public.chore (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  area text,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = Monday
  weight smallint not null check (weight between 1 and 3),
  deed_id uuid references public.deed (id), -- the deed claimed when the chore is done
  active boolean not null default true
);
create index on public.chore (household_id);

create table public.chore_instance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  chore_id uuid not null references public.chore (id),
  week_start date not null, -- Monday, household time zone
  assignee uuid references public.member (user_id),
  source text check (source in ('dibs', 'queue', 'admin')),
  claim_id uuid references public.claim (id),
  unique (chore_id, week_start),
  check ((assignee is null) = (source is null))
);
create index on public.chore_instance (household_id, week_start);

alter table public.chore enable row level security;
alter table public.chore_instance enable row level security;
create policy chore_read on public.chore for select using (household_id = public.current_household());
create policy chore_instance_read on public.chore_instance for select using (household_id = public.current_household());
revoke all on public.chore, public.chore_instance from anon;
grant select on public.chore, public.chore_instance to authenticated;
revoke insert, update, delete on public.chore, public.chore_instance from authenticated;

alter publication supabase_realtime add table public.chore_instance;

-- Admin creates or edits a chore (p_id null creates). Chores are deactivated, never deleted.
create function public.upsert_chore(
  p_id uuid, p_name text, p_area text, p_weekday int, p_weight int, p_deed uuid default null, p_active boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or p_weekday not between 1 and 7 or p_weight not between 1 and 3 then
    raise exception 'invalid chore' using errcode = '22023';
  end if;
  if p_deed is not null and not exists (
       select 1 from public.deed where id = p_deed and household_id = public.current_household() and kind = 'good') then
    raise exception 'deed not found' using errcode = 'P0002';
  end if;
  if p_id is null then
    insert into public.chore (household_id, name, area, weekday, weight, deed_id, active)
      values (public.current_household(), trim(p_name), nullif(trim(p_area), ''), p_weekday, p_weight, p_deed, p_active)
      returning id into v_id;
  else
    update public.chore set name = trim(p_name), area = nullif(trim(p_area), ''), weekday = p_weekday,
           weight = p_weight, deed_id = p_deed, active = p_active
      where id = p_id and household_id = public.current_household() returning id into v_id;
    if v_id is null then raise exception 'chore not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

-- A chore is done once its claim was accepted and the score entry still stands (deleting the entry undoes it).
create view public.chore_done as
  select i.id as instance_id, i.chore_id, i.assignee as member_id, i.week_start
  from public.chore_instance i
  join public.claim c on c.id = i.claim_id and c.status = 'accepted'
  where exists (select 1 from public.score_entry s where s.claim_id = c.id and s.deleted_at is null);
revoke all on public.chore_done from anon, authenticated;

-- The queue for one chore as of a week: housemates, front first. Only weeks before p_week_start count.
--   1. oldest last completion first (never completed = first)
--   2. oldest last assignment first (the round robin: whoever sat out longest goes first)
--   3. name, then id, so the answer is always the same
create function public.chore_queue(p_chore uuid, p_week_start date)
returns table (member_id uuid, pos bigint)
language sql stable security definer set search_path = '' as $$
  select m.user_id,
         row_number() over (order by
           (select max(d.week_start) from public.chore_done d where d.chore_id = c.id and d.member_id = m.user_id and d.week_start < p_week_start) nulls first,
           (select max(i.week_start) from public.chore_instance i where i.chore_id = c.id and i.assignee = m.user_id and i.week_start < p_week_start) nulls first,
           m.display_name, m.user_id)
  from public.chore c
  join public.member m on m.household_id = c.household_id and m.role = 'housemate'
  where c.id = p_chore and c.household_id = public.current_household()
$$;

-- Creates the week's instances and, from the Sunday before it at 00:00 (household time zone), hands out the
-- unclaimed ones: heaviest first, to the housemate with the lowest load, queue order breaking ties.
-- Safe to call as often as you like; nothing is reassigned. Allowed for this week and next week only.
create function public.generate_week(p_week_start date, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hh uuid := public.current_household(); v_tz text; v_local timestamp; v_this date; v_i record; v_pick uuid;
begin
  select timezone into v_tz from public.household where id = v_hh for update; -- one allocation at a time
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  v_local := p_now at time zone v_tz;
  v_this := date_trunc('week', v_local)::date;
  if extract(isodow from p_week_start) <> 1 or p_week_start not in (v_this, v_this + 7) then
    raise exception 'week must be this Monday or next' using errcode = '22023';
  end if;

  insert into public.chore_instance (household_id, chore_id, week_start)
    select v_hh, c.id, p_week_start from public.chore c where c.household_id = v_hh and c.active
    on conflict (chore_id, week_start) do nothing;

  if v_local < (p_week_start - 1)::timestamp then return; end if; -- dibs window still open

  for v_i in
    select i.id, i.chore_id from public.chore_instance i join public.chore c on c.id = i.chore_id
    where i.household_id = v_hh and i.week_start = p_week_start and i.assignee is null and c.active
    order by c.weight desc, c.weekday, c.name, i.id
  loop
    select q.member_id into v_pick from public.chore_queue(v_i.chore_id, p_week_start) q
    order by (select coalesce(sum(c2.weight), 0) from public.chore_instance i2
              join public.chore c2 on c2.id = i2.chore_id
              where i2.week_start = p_week_start and i2.assignee = q.member_id), q.pos
    limit 1;
    exit when v_pick is null; -- no housemates
    update public.chore_instance set assignee = v_pick, source = 'queue' where id = v_i.id;
  end loop;
end $$;

-- Dibs: Thursday 00:00 to Saturday 23:59 before the week, first come first served, up to a fair share of the weight.
create function public.dib_window_open(p_week_start date, p_tz text, p_now timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select (p_now at time zone p_tz) >= (p_week_start - 4)::timestamp
     and (p_now at time zone p_tz) <  (p_week_start - 1)::timestamp
$$;

create function public.dib_chore(p_instance uuid, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_i public.chore_instance; v_w int; v_tz text; v_total int; v_mine int; v_n int;
begin
  perform 1 from public.member where user_id = auth.uid() and role = 'housemate' for update; -- serialise my own dibs
  if not found then raise exception 'housemates only' using errcode = '42501'; end if;
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() for update;
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  if not public.dib_window_open(v_i.week_start, v_tz, p_now) then
    raise exception 'dibs are closed' using errcode = '55000';
  end if;
  if v_i.assignee is not null then raise exception 'already taken' using errcode = '55000'; end if;
  select weight into v_w from public.chore where id = v_i.chore_id;
  select coalesce(sum(c.weight), 0) into v_total from public.chore_instance i
    join public.chore c on c.id = i.chore_id where i.household_id = v_i.household_id and i.week_start = v_i.week_start and c.active;
  select coalesce(sum(c.weight), 0) into v_mine from public.chore_instance i
    join public.chore c on c.id = i.chore_id where i.week_start = v_i.week_start and i.assignee = auth.uid() and i.source = 'dibs';
  select count(*) into v_n from public.member where household_id = v_i.household_id and role = 'housemate';
  if v_mine + v_w > ceil(v_total::numeric / v_n) then raise exception 'over your fair share' using errcode = '55000'; end if;
  update public.chore_instance set assignee = auth.uid(), source = 'dibs' where id = p_instance;
end $$;

create function public.undib_chore(p_instance uuid, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_tz text;
begin
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() and i.assignee = auth.uid() and i.source = 'dibs'
    for update;
  if not found then raise exception 'dib not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  if not public.dib_window_open(v_i.week_start, v_tz, p_now) then
    raise exception 'dibs are closed' using errcode = '55000';
  end if;
  update public.chore_instance set assignee = null, source = null where id = p_instance;
end $$;

-- Admin moves a card to a housemate (or back to unassigned with null). Only the schedule changes: the queue
-- reads completions, so a drag never counts as doing the chore.
create function public.assign_chore(p_instance uuid, p_member uuid, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare v_i public.chore_instance; v_tz text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select i.* into v_i from public.chore_instance i
    where i.id = p_instance and i.household_id = public.current_household() for update;
  if not found then raise exception 'chore not found' using errcode = 'P0002'; end if;
  select timezone into v_tz from public.household where id = v_i.household_id;
  if v_i.week_start + 7 <= (p_now at time zone v_tz)::date or v_i.claim_id is not null then
    raise exception 'this chore can no longer move' using errcode = '55000';
  end if;
  if p_member is not null and not exists (
       select 1 from public.member where user_id = p_member and role = 'housemate' and household_id = v_i.household_id) then
    raise exception 'target must be a housemate in this household' using errcode = '22023';
  end if;
  update public.chore_instance set assignee = p_member, source = case when p_member is null then null else 'admin' end
    where id = p_instance;
end $$;

-- The assignee says "I did it". This is the normal claim flow; an admin still accepts or rejects it.
create function public.complete_chore(p_instance uuid, p_note text default null, p_now timestamptz default now())
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
  if v_i.claim_id is not null and not exists (select 1 from public.claim where id = v_i.claim_id and status = 'rejected') then
    raise exception 'already submitted' using errcode = '55000';
  end if;
  v_claim := public.submit_claim(v_deed, p_note);
  update public.chore_instance set claim_id = v_claim where id = p_instance;
  return v_claim;
end $$;

-- Week helpers, so no client redoes time zone maths: the Monday p_weeks from now, and where a week is in its cycle
-- (early -> dibs Thursday 00:00 -> published Sunday 00:00 -> current Monday 00:00 -> past).
create function public.schedule_week(p_weeks int default 0, p_now timestamptz default now()) returns date
language sql stable set search_path = '' as $$
  select date_trunc('week', p_now at time zone h.timezone)::date + 7 * p_weeks
  from public.household h where h.id = public.current_household()
$$;

create function public.week_phase(p_week_start date, p_now timestamptz default now()) returns text
language sql stable set search_path = '' as $$
  select case
    when l < (p_week_start - 4)::timestamp then 'early'
    when l < (p_week_start - 1)::timestamp then 'dibs'
    when l < p_week_start::timestamp then 'published'
    when l < (p_week_start + 7)::timestamp then 'current'
    else 'past' end
  from (select p_now at time zone h.timezone as l from public.household h where h.id = public.current_household()) x
$$;

-- Who does a deed most often in a period (this_month or prev_month). Needs at least 2 entries; ties share it.
-- Admin-awarded entries count; custom (title-only) entries do not.
create function public.top_doers(p_period text default 'this_month', p_now timestamptz default now())
returns table (deed_id uuid, deed_name text, member_id uuid, display_name text, times bigint)
language plpgsql stable set search_path = '' as $$
declare v_tz text; v_start timestamp; v_from timestamptz; v_to timestamptz;
begin
  select h.timezone into v_tz from public.household h where h.id = public.current_household();
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  if p_period not in ('this_month', 'prev_month') then raise exception 'unknown period' using errcode = '22023'; end if;
  v_start := date_trunc('month', p_now at time zone v_tz);
  if p_period = 'prev_month' then v_start := v_start - interval '1 month'; end if;
  v_from := v_start at time zone v_tz;
  v_to := (v_start + interval '1 month') at time zone v_tz;
  return query
    with t as (
      select s.deed_id as d, s.member_id as m, count(*) as n
      from public.score_entry s join public.member x on x.user_id = s.member_id and x.role = 'housemate'
      where s.household_id = public.current_household() and s.deleted_at is null and s.deed_id is not null
        and s.points > 0 and s.created_at >= v_from and s.created_at < v_to
      group by s.deed_id, s.member_id
    )
    select t.d, dd.name, t.m, mm.display_name, t.n
    from t join public.deed dd on dd.id = t.d join public.member mm on mm.user_id = t.m
    where t.n >= 2 and t.n = (select max(u.n) from t u where u.d = t.d)
    order by t.n desc, dd.name, mm.display_name;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
