-- pgTAP tests for medals. Run with `supabase test db`.
begin;
select plan(9);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good');

-- Weeks start Monday: 14 Sep, 21 Sep, 28 Sep, 5 Oct 2026 (Manila).
-- Ana: Toilet in the weeks of 14 and 21 Sep (admin awards). Dishes in the same two weeks, as Ben also did.
-- Ben: accepted dishes claims in all four weeks (a 4-week streak), Toilet once in the week of 28 Sep.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, d, p, s, '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000001'::uuid, 5, 'admin', '2026-09-15 10:00+08'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000001'::uuid, 5, 'admin', '2026-09-22 10:00+08'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'admin', '2026-09-16 10:00+08'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'admin', '2026-09-23 10:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'claim', '2026-09-15 11:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'claim', '2026-09-22 11:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'claim', '2026-09-29 11:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 1, 'claim', '2026-10-06 11:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000001'::uuid, 5, 'admin', '2026-09-30 10:00+08')
) v (m, d, p, s, t);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;

select is((select count(*) from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000001' and label = 'Toilet champion'), 1::bigint,
  'sole Toilet doer two weeks in a row is a champion');
select is((select count(*) from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000002' and label = 'Toilet champion'), 0::bigint,
  'one week of Toilet is not enough');
select is((select count(*) from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000001' and label = 'Dishes champion'), 0::bigint,
  'a deed two housemates did is nobody''s champion');
select is((select period_start from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000002' and kind = 'streak'), date '2026-09-14',
  'four claim weeks in a row is a streak, starting 14 Sep');
select is((select count(*) from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000001' and kind = 'streak'), 0::bigint,
  'admin-awarded entries do not count toward a streak');
select is((select array_agg(member_id) from public.medals('2026-10-18 12:00+08') where kind = 'mvp_month'),
  array['00000000-0000-0000-0000-000000000001'::uuid], 'Ana has the top September total and is MVP');
select is((select count(*) from public.medals('2026-10-18 12:00+08') where kind = 'mvp_month' and period_start = '2026-10-01'),
  0::bigint, 'the current month has no MVP yet');

-- Deleting an entry removes the medal it supported.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.delete_entry((select id from public.score_entry where created_at = '2026-09-22 10:00+08'::timestamptz));
select is((select count(*) from public.medals('2026-10-18 12:00+08')
           where member_id = '00000000-0000-0000-0000-000000000001' and label = 'Toilet champion'), 0::bigint,
  'deleting an entry removes the medal it supported');

-- Another household sees nothing of this one.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*) from public.medals('2026-10-18 12:00+08')), 0::bigint, 'medals are private to the household');

select * from finish();
rollback;
