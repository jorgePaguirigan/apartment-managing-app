-- An admin who moves a chore back to Unassigned means it: reading the schedule again must not hand it out.
-- held_open marks that; the Sunday allocation skips it, housemates can still dib it. Assigning it again clears the mark.
alter table public.chore_instance add column held_open boolean not null default false;

create or replace function public.generate_week(p_week_start date, p_now timestamptz default now()) returns void
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
    where i.household_id = v_hh and i.week_start = p_week_start and i.assignee is null and not i.held_open and c.active
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

create or replace function public.assign_chore(p_instance uuid, p_member uuid, p_now timestamptz default now()) returns void
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
  update public.chore_instance set assignee = p_member, source = case when p_member is null then null else 'admin' end, held_open = p_member is null
    where id = p_instance;
end $$;
