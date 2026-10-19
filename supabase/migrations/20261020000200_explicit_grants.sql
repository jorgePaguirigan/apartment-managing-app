-- Hosted Supabase grants new tables to `authenticated` by default; a fresh database (local, CI) does not.
-- Spell the grants out so every environment behaves the same. Row-level security still filters rows.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
-- The admin catalog is the one table clients write to directly; policies limit it to admins.
grant insert, update on public.deed to authenticated;
-- Tables with no client access at all (set in earlier migrations) stay closed.
revoke all on public.chore_done from authenticated;
