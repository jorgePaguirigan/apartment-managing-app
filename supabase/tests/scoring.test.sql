-- pgTAP tests for the v1 scoring schema. Run with `supabase test db`.
begin;
select plan(20);

-- Fixture (as superuser): household A (admin + two housemates), household B (admin + housemate).
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Cup', -1, 'penalty'),
  ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000000', 'B deed', 3, 'good');

-- Ana claims a good deed; she cannot claim a penalty; the admin cannot claim at all.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select lives_ok($$select set_config('t.claim', public.submit_claim('dddddddd-0000-0000-0000-000000000001', 'done')::text, true)$$,
  'housemate can claim a good deed');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000003')$$, '22023',
  'only good deeds can be claimed', 'housemate cannot claim a penalty');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000004')$$, 'P0002',
  'deed not found', 'cannot claim another household''s deed');

-- Housemates cannot write scores, decide claims, or edit the catalog.
select throws_ok($$insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by)
  values ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
          'dddddddd-0000-0000-0000-000000000002', 100, 'admin', '00000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'housemate cannot insert a score entry');
select throws_ok($$select public.decide_claim(current_setting('t.claim')::uuid, true)$$, '42501',
  'admin only', 'housemate cannot decide a claim');
select lives_ok($$update public.deed set points = 100 where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'housemate deed update is filtered by RLS, not an error');

-- Visibility: Ben cannot see Ana's claim; household B sees nothing of A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*) from public.claim), 0::bigint, 'housemate sees only their own claims');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b0","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select is((select count(*) from public.deed where household_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0::bigint,
  'another household''s catalog is invisible');

-- Admin accepts: entry gets the deed's points; accepting twice fails; catalog edits do not rewrite history.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from public.claim), 1::bigint, 'admin sees the pending claim');
select is((select points from public.deed where id = 'dddddddd-0000-0000-0000-000000000001'), 2,
  'housemate edit did not change the deed');
select lives_ok($$select public.decide_claim(current_setting('t.claim')::uuid, true)$$, 'admin accepts the claim');
select throws_ok($$select public.decide_claim(current_setting('t.claim')::uuid, true)$$, '55000',
  'claim already decided', 'a claim cannot be decided twice');
update public.deed set points = 50 where id = 'dddddddd-0000-0000-0000-000000000001';
select is((select points from public.score_entry where claim_id = current_setting('t.claim')::uuid), 2,
  'entry keeps the points from acceptance time');

-- Admin awards: penalties work, admins cannot be scored.
select lives_ok($$select public.award('00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000003')$$,
  'admin enters a penalty');
select throws_ok($$select public.award('00000000-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-000000000002')$$,
  '22023', 'target must be a housemate in this household', 'an admin cannot be scored');

-- Rejecting creates no entry.
reset role;
insert into public.claim (id, household_id, member_id, deed_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select public.decide_claim('cccccccc-0000-0000-0000-000000000001', false);
select is((select count(*) from public.score_entry where claim_id = 'cccccccc-0000-0000-0000-000000000001'), 0::bigint,
  'a rejected claim creates no entry');

-- Entries are immutable apart from the soft delete (checked as superuser, so only the trigger can stop it).
reset role;
select throws_ok($$update public.score_entry set points = 99$$, '55000', 'score entries are immutable',
  'entry points cannot be rewritten');

-- Leaderboard: Manila week boundaries, ties share a rank, soft delete removes points.
delete from public.score_entry;
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', p, 'admin',
       '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 5, '2026-10-17 23:59:59+08'),  -- Saturday: previous week
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-10-18 00:00:00+08'),  -- Sunday: this week
  ('00000000-0000-0000-0000-000000000002'::uuid, 2, '2026-10-20 10:00:00+08')   -- this week
) v (m, p, t);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select results_eq($$select display_name, points, rank from public.leaderboard('this_week', '2026-10-21 12:00:00+08') $$,
  $$values ('Ana'::text, 2::bigint, 1::bigint), ('Ben'::text, 2::bigint, 1::bigint)$$,
  'tied housemates share rank 1 this week');
select results_eq($$select display_name, points, rank from public.leaderboard('prev_week', '2026-10-21 12:00:00+08') $$,
  $$values ('Ana'::text, 5::bigint, 1::bigint), ('Ben'::text, 0::bigint, 2::bigint)$$,
  'Saturday 23:59 Manila counts in the previous week');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.delete_entry((select id from public.score_entry where points = 5));
select is((select points from public.leaderboard('prev_week', '2026-10-21 12:00:00+08') where display_name = 'Ana'), 0::bigint,
  'a soft-deleted entry no longer counts');

select * from finish();
rollback;
