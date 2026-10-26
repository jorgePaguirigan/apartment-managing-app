-- Claim emails, part 2: decision links. The email to an admin carries a token that lets that admin accept or reject one
-- claim without signing in. The token is the credential: 64 random hex characters, stored only as a hash, good for
-- 7 days, for one admin and one claim. The confirm page calls the two public functions below with the normal public
-- key, so the web app never holds a service key.

create table public.decision_token (
  token_hash bytea primary key,
  claim_id uuid not null references public.claim (id) on delete cascade,
  admin_id uuid not null references public.member (user_id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
create index on public.decision_token (claim_id);
alter table public.decision_token enable row level security;
revoke all on public.decision_token from anon, authenticated;

-- The decision itself, shared by the app (the signed-in admin) and the link (the admin the token was issued to).
create function public.decide_claim_as(p_admin uuid, p_claim uuid, p_accept boolean, p_points int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claim; v_points int; v_entry uuid;
begin
  if not exists (select 1 from public.member where user_id = p_admin and role = 'admin') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_claim from public.claim
    where id = p_claim and household_id = (select household_id from public.member where user_id = p_admin) for update;
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
revoke execute on function public.decide_claim_as(uuid, uuid, boolean, int) from public, anon, authenticated;

create or replace function public.decide_claim(p_claim uuid, p_accept boolean, p_points int default null) returns void
language sql security definer set search_path = '' as $$
  select public.decide_claim_as(auth.uid(), p_claim, p_accept, p_points)
$$;

-- Called by the sender (service role) when it builds an admin email. Returns the token once; only its hash is kept.
create function public.issue_decision_token(p_claim uuid, p_admin uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_household uuid; v_token text;
begin
  select household_id into v_household from public.claim where id = p_claim;
  if not found then raise exception 'claim not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.member where user_id = p_admin and role = 'admin' and household_id = v_household) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.decision_token (token_hash, claim_id, admin_id, expires_at)
    values (sha256(convert_to(v_token, 'utf8')), p_claim, p_admin, now() + interval '7 days');
  return v_token;
end $$;
revoke execute on function public.issue_decision_token(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_decision_token(uuid, uuid) to service_role;

-- What the confirm page shows. An unknown or expired token shows nothing.
create function public.claim_for_token(p_token text)
returns table (housemate text, chore text, points int, note text, custom boolean, status text, household text)
language sql stable security definer set search_path = '' as $$
  select m.display_name, coalesce(d.name, c.title), d.points, c.note, c.deed_id is null, c.status, h.name
  from public.decision_token t
  join public.claim c on c.id = t.claim_id
  join public.member m on m.user_id = c.member_id
  join public.household h on h.id = c.household_id
  left join public.deed d on d.id = c.deed_id
  where t.token_hash = sha256(convert_to(p_token, 'utf8')) and t.expires_at > now()
$$;

create function public.decide_claim_by_token(p_token text, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.decision_token;
begin
  select * into v from public.decision_token
    where token_hash = sha256(convert_to(p_token, 'utf8')) and expires_at > now() for update;
  if not found then raise exception 'link not valid' using errcode = 'P0002'; end if;
  perform public.decide_claim_as(v.admin_id, v.claim_id, p_accept, null);
  update public.decision_token set used_at = now() where token_hash = v.token_hash;
end $$;

revoke execute on function public.claim_for_token(text) from public;
revoke execute on function public.decide_claim_by_token(text, boolean) from public;
grant execute on function public.claim_for_token(text) to anon, authenticated;
grant execute on function public.decide_claim_by_token(text, boolean) to anon, authenticated;
