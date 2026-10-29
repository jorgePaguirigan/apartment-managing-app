-- A claim can name contributors: other scored members who did the deed with the claimer. Accepting scores the deed's full points
-- once for each person. The people on a claim are always scored members of one household, listed once, so a claim never has more
-- people than the household has housemates.
create table public.claim_contributor (
  claim_id uuid not null references public.claim (id) on delete cascade,
  member_id uuid not null references public.member (user_id) on delete cascade,
  primary key (claim_id, member_id)
);
alter table public.claim_contributor enable row level security;
revoke all on public.claim_contributor from anon, authenticated;
grant select on public.claim_contributor to authenticated;
create policy contributor_read on public.claim_contributor for select using (
  member_id = auth.uid() or exists (
    select 1 from public.claim c
    where c.id = claim_id and c.household_id = public.current_household() and (public.is_admin() or c.member_id = auth.uid())));

-- One entry per person per claim (it was one entry per claim).
alter table public.score_entry drop constraint score_entry_claim_id_key;
alter table public.score_entry add constraint score_entry_claim_member_key unique (claim_id, member_id);

-- Raises unless every id is a scored member of the claimer's household, listed once, and not the claimer.
create function public.check_contributors(p_claimer uuid, p_ids uuid[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(cardinality(p_ids), 0) = 0 then return; end if;
  if cardinality(p_ids) <> (select count(distinct i) from unnest(p_ids) i) or p_claimer = any (p_ids)
     or cardinality(p_ids) <> (select count(*) from public.member
                               where user_id = any (p_ids) and scored and household_id = public.current_household()) then
    raise exception 'invalid contributors' using errcode = '22023';
  end if;
end $$;
revoke execute on function public.check_contributors(uuid, uuid[]) from public, anon, authenticated;

-- Stores the contributors and names them in the admin email already queued by the claim insert.
create function public.add_contributors(p_claim uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(cardinality(p_ids), 0) = 0 then return; end if;
  insert into public.claim_contributor (claim_id, member_id) select p_claim, unnest(p_ids);
  update public.notification n
    set payload = n.payload || jsonb_build_object('contributors',
      (select jsonb_agg(m.display_name order by m.display_name) from public.member m where m.user_id = any (p_ids)))
    where n.claim_id = p_claim and n.kind = 'admin_claim';
end $$;
revoke execute on function public.add_contributors(uuid, uuid[]) from public, anon, authenticated;

drop function public.submit_claim(uuid, text);
create function public.submit_claim(p_deed uuid, p_note text default null, p_contributors uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_deed public.deed; v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and scored) then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  select * into v_deed from public.deed where id = p_deed and household_id = public.current_household();
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  if not v_deed.active then raise exception 'deed is inactive' using errcode = '22023'; end if;
  if v_deed.kind <> 'good' then
    raise exception 'only good deeds can be claimed' using errcode = '22023';
  end if;
  perform public.check_contributors(auth.uid(), p_contributors);
  insert into public.claim (household_id, member_id, deed_id, note)
    values (v_deed.household_id, auth.uid(), p_deed, p_note) returning id into v_id;
  perform public.add_contributors(v_id, p_contributors);
  return v_id;
exception when unique_violation then
  raise exception 'already waiting for approval' using errcode = '55000';
end $$;

drop function public.submit_custom_claim(text, text);
create function public.submit_custom_claim(p_title text, p_note text default null, p_contributors uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_title text := btrim(coalesce(p_title, '')); v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and scored) then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  perform public.check_contributors(auth.uid(), p_contributors);
  insert into public.claim (household_id, member_id, title, note)
    values (public.current_household(), auth.uid(), v_title, p_note) returning id into v_id;
  perform public.add_contributors(v_id, p_contributors);
  return v_id;
exception when unique_violation then
  raise exception 'already waiting for approval' using errcode = '55000';
end $$;

revoke execute on function public.submit_claim(uuid, text, uuid[]), public.submit_custom_claim(text, text, uuid[]) from public, anon;
grant execute on function public.submit_claim(uuid, text, uuid[]), public.submit_custom_claim(text, text, uuid[]) to authenticated;

-- The claims a member is a contributor on, shaped like their own History. A contributor cannot read the claim rows themselves.
create function public.my_contributions()
returns table (id uuid, title text, note text, status text, created_at timestamptz, points int, deleted boolean, claimer text)
language sql stable security definer set search_path = '' as $$
  select c.id, coalesce(d.name, c.title), c.note, c.status, c.created_at,
         case c.status when 'accepted' then e.points when 'pending' then d.points else 0 end,
         e.deleted_at is not null, m.display_name
  from public.claim_contributor cc
  join public.claim c on c.id = cc.claim_id
  join public.member m on m.user_id = c.member_id
  left join public.deed d on d.id = c.deed_id
  left join public.score_entry e on e.claim_id = c.id and e.member_id = cc.member_id
  where cc.member_id = auth.uid()
  order by c.created_at desc limit 100
$$;
revoke execute on function public.my_contributions() from public, anon;
grant execute on function public.my_contributions() to authenticated;

-- The standings "before" a decision leave out the whole claim, not just the one entry they are given.
-- Rewritten in place so each function keeps its body.
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in ('leaderboard_for', 'medals_for')
  loop
    def := regexp_replace(pg_get_functiondef(f.oid), '(\w+)\.id is distinct from p_exclude',
      '(\1.id is distinct from p_exclude and (\1.claim_id is null or \1.claim_id is distinct from (select x.claim_id from public.score_entry x where x.id = p_exclude)))', 'g');
    execute def;
  end loop;
end $$;

-- Each contributor is named in the housemate email, and scores their own entry.
create or replace function public.queue_decision_notifications(p_claim uuid, p_entry uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_claim public.claim; v_actor text; v_chore text; v_payload jsonb; v_names jsonb; v_now timestamptz := now();
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
  -- Named only when there are some, so a claim without contributors keeps its payload as it was.
  select jsonb_agg(x.display_name order by x.display_name) into v_names
    from public.claim_contributor cc join public.member x on x.user_id = cc.member_id where cc.claim_id = p_claim;
  if v_names is not null then v_payload := v_payload || jsonb_build_object('contributors', v_names); end if;
  insert into public.notification (household_id, kind, claim_id, recipient_id, payload)
  select v_claim.household_id, 'housemate_decision', p_claim, m.user_id, v_payload
  from public.member m where m.household_id = v_claim.household_id and m.scored;
end $$;

create or replace function public.decide_claim_as(p_admin uuid, p_claim uuid, p_accept boolean, p_points int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claim; v_points int; v_entry uuid;
begin
  if not exists (select 1 from public.member where user_id = p_admin and role = 'admin') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_claim from public.claim
    where id = p_claim and household_id = (select household_id from public.member where user_id = p_admin) for update;
  if not found then raise exception 'claim not found' using errcode = 'P0002'; end if;
  if v_claim.member_id = p_admin then raise exception 'cannot decide your own claim' using errcode = '42501'; end if;
  if v_claim.status <> 'pending' then raise exception 'claim already decided' using errcode = '55000'; end if;
  if p_accept and v_claim.deed_id is null and coalesce(p_points, 0) <= 0 then
    raise exception 'points must be positive' using errcode = '22023';
  end if;
  if p_points is not null and v_claim.deed_id is not null then
    raise exception 'catalog claims use catalog points' using errcode = '22023';
  end if;
  update public.claim
    set status = case when p_accept then 'accepted' else 'rejected' end,
        decided_by = p_admin, decided_at = now()
    where id = p_claim;
  if p_accept then
    if v_claim.deed_id is null then
      v_points := p_points;
    else
      select points into v_points from public.deed where id = v_claim.deed_id;
    end if;
    insert into public.score_entry (household_id, member_id, deed_id, title, points, source, claim_id, approved_by)
      values (v_claim.household_id, v_claim.member_id, v_claim.deed_id, v_claim.title, v_points, 'claim', p_claim, p_admin)
      returning id into v_entry;
    -- Contributors get the same deed and points, unless they left the household since.
    insert into public.score_entry (household_id, member_id, deed_id, title, points, source, claim_id, approved_by)
      select v_claim.household_id, cc.member_id, v_claim.deed_id, v_claim.title, v_points, 'claim', p_claim, p_admin
      from public.claim_contributor cc join public.member m on m.user_id = cc.member_id and m.scored
      where cc.claim_id = p_claim;
  end if;
  perform public.queue_decision_notifications(p_claim, v_entry);
end $$;
