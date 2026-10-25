-- An admin can delete a catalog deed. Score entries and claims point at their deed and never change, so the row stays,
-- stamped deleted_at and inactive: it leaves the catalog and can no longer be claimed or awarded (both already require
-- active), while past entries keep their name, points and medals.
alter table public.deed add column deleted_at timestamptz;

-- Direct catalog writes only reach deeds that still exist.
drop policy deed_admin_write on public.deed;
create policy deed_admin_write on public.deed for all
  using (household_id = public.current_household() and public.is_admin() and deleted_at is null)
  with check (household_id = public.current_household() and public.is_admin() and deleted_at is null);

create function public.delete_deed(p_deed uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.deed set deleted_at = now(), active = false
    where id = p_deed and household_id = public.current_household() and deleted_at is null;
  if not found then raise exception 'deed not found' using errcode = 'P0002'; end if;
  update public.claim set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where deed_id = p_deed and status = 'pending';
  update public.chore set deed_id = null where deed_id = p_deed;
end $$;

revoke execute on function public.delete_deed(uuid) from public, anon;
grant execute on function public.delete_deed(uuid) to authenticated;
