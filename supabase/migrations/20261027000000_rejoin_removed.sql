-- A removed housemate can rejoin through a new invite to the same household. Their member row (role 'removed') is brought
-- back to life instead of inserted again, so their history is theirs again. Anyone else already in a household still cannot join.
create or replace function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_invite public.invite;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_invite from public.invite
    where code = p_code and revoked_at is null and expires_at > now();
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()
               and (role <> 'removed' or household_id <> v_invite.household_id)) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  update public.member set role = v_invite.role, display_name = p_display_name
    where user_id = auth.uid() and role = 'removed';
  if not found then
    insert into public.member (user_id, household_id, role, display_name)
      values (auth.uid(), v_invite.household_id, v_invite.role, p_display_name);
  end if;
  return v_invite.household_id;
end $$;
