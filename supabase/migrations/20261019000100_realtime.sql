-- Live updates: the web app listens for changes to claims and score entries, so screens refresh without a reload.
-- Realtime applies the read policies, so each person only hears about rows they can read.
alter publication supabase_realtime add table public.claim, public.score_entry;
