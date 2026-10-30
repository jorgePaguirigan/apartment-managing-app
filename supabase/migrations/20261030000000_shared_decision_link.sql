-- One admin email for all admins, so one decision link for all admins. The token is per claim; the admin who opens the
-- link picks who they are on the confirm page, and that admin is recorded as the decider. decide_claim_as still checks
-- that the pick is an admin of the claim's household who did not make the claim.
alter table public.decision_token drop column admin_id;

drop function public.issue_decision_token(uuid, uuid);
create function public.issue_decision_token(p_claim uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not exists (select 1 from public.claim where id = p_claim) then
    raise exception 'claim not found' using errcode = 'P0002';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.decision_token (token_hash, claim_id, expires_at)
    values (sha256(convert_to(v_token, 'utf8')), p_claim, now() + interval '7 days');
  return v_token;
end $$;
revoke execute on function public.issue_decision_token(uuid) from public, anon, authenticated;
grant execute on function public.issue_decision_token(uuid) to service_role;

-- The names on the confirm page: the claim's household admins, except the one who made the claim.
create function public.admins_for_token(p_token text) returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.display_name
  from public.decision_token t
  join public.claim c on c.id = t.claim_id
  join public.member m on m.household_id = c.household_id and m.role = 'admin' and m.user_id <> c.member_id
  where t.token_hash = sha256(convert_to(p_token, 'utf8')) and t.expires_at > now()
  order by m.display_name
$$;
revoke execute on function public.admins_for_token(text) from public;
grant execute on function public.admins_for_token(text) to anon, authenticated;

drop function public.decide_claim_by_token(text, boolean);
create function public.decide_claim_by_token(p_token text, p_accept boolean, p_admin uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.decision_token;
begin
  select * into v from public.decision_token
    where token_hash = sha256(convert_to(p_token, 'utf8')) and expires_at > now() for update;
  if not found then raise exception 'link not valid' using errcode = 'P0002'; end if;
  perform public.decide_claim_as(p_admin, v.claim_id, p_accept, null);
  update public.decision_token set used_at = now() where token_hash = v.token_hash;
end $$;
revoke execute on function public.decide_claim_by_token(text, boolean, uuid) from public;
grant execute on function public.decide_claim_by_token(text, boolean, uuid) to anon, authenticated;
