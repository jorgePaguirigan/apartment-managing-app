-- "Ungrouped" is what a deed with no group is called, so a real group with that name shows up twice in the catalog.
-- Remove existing ones (their deeds fall back to no group, which is what the name meant), then forbid new ones.
delete from public.deed_group where lower(trim(name)) = 'ungrouped';
alter table public.deed_group add constraint deed_group_name_not_ungrouped check (lower(trim(name)) <> 'ungrouped');
