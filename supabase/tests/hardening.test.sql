-- pgTAP tests for the audit fixes. Run with `supabase test db`.
begin;
select plan(10);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000b0'), ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');
insert into public.invite (code, household_id, expires_at) values
  ('fresh', 'aaaaaaaa-0000-0000-0000-000000000000', now() + interval '1 day'),
  ('stale', 'aaaaaaaa-0000-0000-0000-000000000000', now() - interval '1 minute');

-- Time zones: POSIX-style text is rejected, a real name works.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select throws_ok($$select public.create_household('X', 'Cy', 'UTC+8')$$, '22023', 'unknown time zone',
  'POSIX time zone text is rejected');
select lives_ok($$select public.create_household('X', 'Cy', 'Asia/Manila')$$, 'a real zone name is accepted');

-- Invites: expired code rejected, valid code works.
reset role;
delete from public.member where user_id = '00000000-0000-0000-0000-0000000000c1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.join_household('stale', 'Cy')$$, 'P0002', 'invite not found', 'expired invite is rejected');
select lives_ok($$select public.join_household('fresh', 'Cy')$$, 'unexpired invite works');

-- The same deed may be claimed again while one waits; a new claim is also fine after the first is decided.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select lives_ok($$select set_config('t.claim', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true)$$,
  'first claim works');
select lives_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000001')$$, 'a second pending claim of the same deed is allowed');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.decide_claim(current_setting('t.claim')::uuid, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select lives_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000001')$$, 'a new claim works after the first is decided');
select is((select count(*) from public.invite), 0::bigint, 'a housemate cannot read invites');

-- Cross-household award is rejected.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$select public.award('00000000-0000-0000-0000-0000000000b1', 'dddddddd-0000-0000-0000-000000000001')$$,
  '22023', 'target must be a housemate in this household', 'admin cannot award another household''s housemate');

-- Month ranges: last second of the month counts in it; January looks back to December.
reset role;
delete from public.score_entry; -- drop the entry made by the accepted claim so only the fixture below counts
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001', p, 'admin', '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values (1, '2026-10-31 23:59:59+08'), (10, '2026-11-01 00:00:00+08'), (100, '2025-12-31 23:59:59+08')) v (p, t);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$select (select points from public.leaderboard('this_month', '2026-10-15 12:00+08') where display_name = 'Ana')
    , (select points from public.leaderboard('this_month', '2026-11-15 12:00+08') where display_name = 'Ana')
    , (select points from public.leaderboard('prev_month', '2026-01-15 12:00+08') where display_name = 'Ana')$$,
  $$values (1::bigint, 10::bigint, 100::bigint)$$,
  'month ranges: end of October, start of November, January looks back to December');

select * from finish();
rollback;
