-- v1 scoring schema. All writes go through the functions below; clients only read tables.

create table public.household (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now()
);

-- One row per signed-in person; one household and one role each (v1).
create table public.member (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.household (id) on delete cascade,
  role text not null check (role in ('admin', 'housemate')),
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now()
);
create index on public.member (household_id);

create table public.deed (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  points int not null,
  kind text not null check (kind in ('good', 'penalty')),
  active boolean not null default true,
  check ((kind = 'good' and points > 0) or (kind = 'penalty' and points < 0))
);
create index on public.deed (household_id);

create table public.claim (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  member_id uuid not null references public.member (user_id) on delete cascade,
  deed_id uuid not null references public.deed (id),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  decided_by uuid references public.member (user_id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.claim (household_id, status);

create table public.score_entry (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  member_id uuid not null references public.member (user_id) on delete cascade,
  deed_id uuid not null references public.deed (id),
  points int not null, -- copied from the deed so later catalog edits never change history
  source text not null check (source in ('claim', 'admin')),
  claim_id uuid unique references public.claim (id),
  approved_by uuid not null references public.member (user_id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.score_entry (household_id, created_at);

-- Medal rules arrive in M3; the table is here so the schema is complete.
create table public.medal (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  member_id uuid not null references public.member (user_id) on delete cascade,
  type text not null,
  period_start date not null,
  awarded_at timestamptz not null default now(),
  unique (member_id, type, period_start)
);

-- Entries are immutable except for the soft delete.
create function public.score_entry_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.deleted_at is not null
     or (to_jsonb(new) - 'deleted_at') <> (to_jsonb(old) - 'deleted_at') then
    raise exception 'score entries are immutable' using errcode = '55000';
  end if;
  return new;
end $$;
create trigger score_entry_guard before update on public.score_entry
  for each row execute function public.score_entry_guard();

-- Helpers used by policies and functions. security definer avoids RLS recursion on member.
create function public.current_household() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.member where user_id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.member where user_id = auth.uid()), false)
$$;

-- Row level security: reads scoped to the household; writes only via functions below.
alter table public.household enable row level security;
alter table public.member enable row level security;
alter table public.deed enable row level security;
alter table public.claim enable row level security;
alter table public.score_entry enable row level security;
alter table public.medal enable row level security;

create policy household_read on public.household for select using (id = public.current_household());
create policy member_read on public.member for select using (household_id = public.current_household());
create policy deed_read on public.deed for select using (household_id = public.current_household());
create policy deed_admin_write on public.deed for all
  using (household_id = public.current_household() and public.is_admin())
  with check (household_id = public.current_household() and public.is_admin());
create policy claim_read on public.claim for select
  using (household_id = public.current_household() and (public.is_admin() or member_id = auth.uid()));
create policy score_entry_read on public.score_entry for select using (household_id = public.current_household());
create policy medal_read on public.medal for select using (household_id = public.current_household());

revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.household, public.member, public.claim,
  public.score_entry, public.medal from authenticated;

create function public.create_household(
  p_name text, p_display_name text, p_timezone text default 'Asia/Manila'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  perform now() at time zone p_timezone; -- raises on an unknown time zone
  insert into public.household (name, timezone) values (p_name, p_timezone) returning id into v_id;
  insert into public.member (user_id, household_id, role, display_name)
    values (auth.uid(), v_id, 'admin', p_display_name);
  insert into public.deed (household_id, name, points, kind) values
    (v_id, 'Cleaned toilet', 5, 'good'),
    (v_id, 'Cooked dinner', 4, 'good'),
    (v_id, 'Washed own dishes', 1, 'good'),
    (v_id, 'Forgot to wash cup', -1, 'penalty'),
    (v_id, 'Messy room', -2, 'penalty');
  return v_id;
end $$;

create function public.submit_claim(p_deed uuid, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_deed public.deed; v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and role = 'housemate') then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  select * into v_deed from public.deed where id = p_deed and household_id = public.current_household();
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  if not v_deed.active then raise exception 'deed is inactive' using errcode = '22023'; end if;
  if v_deed.kind <> 'good' then
    raise exception 'only good deeds can be claimed' using errcode = '22023';
  end if;
  insert into public.claim (household_id, member_id, deed_id, note)
    values (v_deed.household_id, auth.uid(), p_deed, p_note) returning id into v_id;
  return v_id;
end $$;

create function public.decide_claim(p_claim uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claim; v_points int;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into v_claim from public.claim
    where id = p_claim and household_id = public.current_household() for update;
  if not found then raise exception 'claim not found' using errcode = 'P0002'; end if;
  if v_claim.status <> 'pending' then raise exception 'claim already decided' using errcode = '55000'; end if;
  update public.claim
    set status = case when p_accept then 'accepted' else 'rejected' end,
        decided_by = auth.uid(), decided_at = now()
    where id = p_claim;
  if p_accept then
    select points into v_points from public.deed where id = v_claim.deed_id;
    insert into public.score_entry (household_id, member_id, deed_id, points, source, claim_id, approved_by)
      values (v_claim.household_id, v_claim.member_id, v_claim.deed_id, v_points, 'claim', p_claim, auth.uid());
  end if;
end $$;

-- Admin scores a housemate directly. This is also how penalties are entered.
create function public.award(p_member uuid, p_deed uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_deed public.deed; v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if not exists (select 1 from public.member
                 where user_id = p_member and role = 'housemate' and household_id = public.current_household()) then
    raise exception 'target must be a housemate in this household' using errcode = '22023';
  end if;
  select * into v_deed from public.deed where id = p_deed and household_id = public.current_household();
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  if not v_deed.active then raise exception 'deed is inactive' using errcode = '22023'; end if;
  insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by)
    values (v_deed.household_id, p_member, p_deed, v_deed.points, 'admin', auth.uid()) returning id into v_id;
  return v_id;
end $$;

create function public.delete_entry(p_entry uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.score_entry set deleted_at = now()
    where id = p_entry and household_id = public.current_household() and deleted_at is null;
  if not found then raise exception 'entry not found' using errcode = 'P0002'; end if;
end $$;

-- Housemates ranked by points in a week or month of the household's time zone. Ties share a rank.
-- p_now exists so tests can pin the clock.
create function public.leaderboard(p_period text, p_now timestamptz default now())
returns table (member_id uuid, display_name text, points bigint, rank bigint)
language plpgsql stable set search_path = '' as $$
declare
  v_tz text; v_unit text; v_step interval; v_start timestamp; v_from timestamptz; v_to timestamptz;
begin
  select h.timezone into v_tz from public.household h where h.id = public.current_household();
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
      on e.member_id = m.user_id and e.deleted_at is null
     and e.created_at >= v_from and e.created_at < v_to
    where m.household_id = public.current_household() and m.role = 'housemate'
    group by m.user_id, m.display_name
    order by 4, m.display_name;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
