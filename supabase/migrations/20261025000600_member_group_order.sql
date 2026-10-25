-- Each member can arrange the catalog groups for their own "I did…" view. Only they read it; the admin's catalog
-- order (deed_group.position) is never touched. Groups they have not placed follow in the catalog order.
create table public.member_group_order (
  member_id uuid not null references public.member (user_id) on delete cascade,
  group_id uuid not null references public.deed_group (id) on delete cascade,
  position int not null,
  primary key (member_id, group_id)
);

alter table public.member_group_order enable row level security;
create policy member_group_order_own on public.member_group_order for select using (member_id = auth.uid());
revoke all on public.member_group_order from anon;
grant select on public.member_group_order to authenticated;

-- Replaces the caller's order with p_ids, front first. Every id must be a group of their household.
create function public.set_my_group_order(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_hh uuid := public.current_household();
begin
  if v_hh is null then raise exception 'not a member' using errcode = '42501'; end if;
  if exists (select 1 from unnest(p_ids) x(id)
             where not exists (select 1 from public.deed_group g where g.id = x.id and g.household_id = v_hh)) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  delete from public.member_group_order where member_id = auth.uid();
  insert into public.member_group_order (member_id, group_id, position)
    select auth.uid(), x.id, x.n - 1 from unnest(p_ids) with ordinality x(id, n);
end $$;

revoke execute on function public.set_my_group_order(uuid[]) from public, anon;
grant execute on function public.set_my_group_order(uuid[]) to authenticated;
