-- An admin can remove a housemate. The member row stays (role 'removed') so their score entries, claims and spending
-- keep their history. Every rule that picks housemates filters on role = 'housemate', so a removed member drops off the
-- leaderboard, schedule, dibs, awards and claims with no change to those functions.
alter table public.member drop constraint member_role_check;
alter table public.member add constraint member_role_check check (role in ('admin', 'housemate', 'removed'));

-- A removed member reads nothing of the household any more.
create or replace function public.current_household() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.member where user_id = auth.uid() and role <> 'removed'
$$;
-- They can still read their own row, so the app can tell them they were removed.
create policy member_read_self on public.member for select using (user_id = auth.uid());

create function public.remove_housemate(p_member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tz text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.member set role = 'removed'
    where user_id = p_member and role = 'housemate' and household_id = public.current_household();
  if not found then raise exception 'housemate not found' using errcode = 'P0002'; end if;

  update public.claim set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where member_id = p_member and status = 'pending';

  -- From this week on, chores they had not finished go back to unassigned. Earlier weeks stay as they were.
  select h.timezone into v_tz from public.household h where h.id = public.current_household();
  update public.chore_instance i set assignee = null, source = null, claim_id = null
    where i.assignee = p_member
      and i.week_start >= date_trunc('week', now() at time zone v_tz)::date
      and not exists (select 1 from public.claim c where c.id = i.claim_id and c.status = 'accepted');
end $$;

revoke execute on function public.remove_housemate(uuid) from public, anon;
grant execute on function public.remove_housemate(uuid) to authenticated;
