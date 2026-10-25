-- Catalog groups (Kitchen, Laundry, ...). Admins add them and drag deeds between them; a deed with no group shows as Ungrouped.
create table public.deed_group (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, household_id)
);
create index on public.deed_group (household_id);

-- The composite key keeps a deed inside its own household's groups.
alter table public.deed add column group_id uuid;
alter table public.deed add foreign key (group_id, household_id)
  references public.deed_group (id, household_id) on delete set null (group_id);

alter table public.deed_group enable row level security;
create policy deed_group_read on public.deed_group for select using (household_id = public.current_household());
create policy deed_group_admin_write on public.deed_group for all
  using (household_id = public.current_household() and public.is_admin())
  with check (household_id = public.current_household() and public.is_admin());
revoke all on public.deed_group from anon;
grant select, insert, update on public.deed_group to authenticated;
