-- pgTAP test for live updates. Run with `supabase test db`.
begin;
select plan(1);
select is((select count(*) from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('claim', 'score_entry', 'budget_category', 'spend_entry', 'member')),
  5::bigint, 'claims, score entries, budget tables and members are published to Realtime');
select * from finish();
rollback;
