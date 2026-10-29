-- An admin can promote a housemate. The promoted admin stays scored (also_housemate), so they keep points and chores.
create function public.make_admin(p_member uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.member set role = 'admin', also_housemate = true
    where user_id = p_member and role = 'housemate' and household_id = public.current_household();
  if not found then raise exception 'target must be a housemate in this household' using errcode = '22023'; end if;
end $$;

revoke execute on function public.make_admin(uuid) from public, anon;
grant execute on function public.make_admin(uuid) to authenticated;

-- Nobody decides their own claim, in the app or from an email link. decide_claim_as is otherwise unchanged.
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
  end if;
  perform public.queue_decision_notifications(p_claim, v_entry);
end $$;
