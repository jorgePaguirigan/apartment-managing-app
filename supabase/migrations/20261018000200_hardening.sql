-- Hardening after the first audit. Safe to run once on a project that already has the earlier migrations.

-- 1. Time zones: only real zone names. Postgres also accepts POSIX text like 'UTC+8', which means 8 hours WEST.
create or replace function public.create_household(
  p_name text, p_display_name text, p_timezone text default 'Asia/Manila'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
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

-- 2. One pending claim per housemate and deed. Existing duplicates keep the oldest; the rest are rejected.
update public.claim set status = 'rejected', decided_at = now()
where id in (
  select id from (
    select id, row_number() over (partition by member_id, deed_id order by created_at, id) as n
    from public.claim where status = 'pending'
  ) d where n > 1
);
create unique index claim_pending_unique on public.claim (member_id, deed_id) where status = 'pending';

create or replace function public.submit_claim(p_deed uuid, p_note text default null) returns uuid
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
exception when unique_violation then
  raise exception 'already waiting for approval' using errcode = '55000';
end $$;

-- 3. Invite links expire after 7 days.
alter table public.invite add column expires_at timestamptz not null default now() + interval '7 days';

create or replace function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_invite public.invite;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  select * into v_invite from public.invite
    where code = p_code and revoked_at is null and expires_at > now();
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  insert into public.member (user_id, household_id, role, display_name)
    values (auth.uid(), v_invite.household_id, v_invite.role, p_display_name);
  return v_invite.household_id;
end $$;
