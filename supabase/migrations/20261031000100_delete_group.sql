-- Admins can delete a catalog group. The existing admin-only policy decides who; the deeds in it fall back to no group (on delete set null).
grant delete on public.deed_group to authenticated;
