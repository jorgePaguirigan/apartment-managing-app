-- pgTAP test for live updates. Run with `supabase test db`.
begin;
select plan(1);
select is((select count(*) from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('claim', 'score_entry')),
  2::bigint, 'claims and score entries are published to Realtime');
select * from finish();
rollback;
