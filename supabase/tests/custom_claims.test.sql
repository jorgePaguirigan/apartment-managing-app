-- pgTAP tests for custom claims (a deed typed by the housemate, points set by the admin). Run with `supabase test db`.
begin;
select plan(12);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select lives_ok($$select set_config('t.custom', public.submit_custom_claim('Fixed the shelf', 'with my drill')::text, true)$$,
  'a housemate submits a custom claim');
select lives_ok($$select public.submit_custom_claim('  fixed the SHELF ')$$, 'the same custom claim may wait twice');
select throws_ok($$select public.submit_custom_claim('   ')$$, '22023', 'invalid title', 'a blank title is rejected');
select throws_ok($$insert into public.claim (household_id, member_id, title) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'sneaky')$$, '42501',
  'permission denied for table claim', 'clients cannot write claims directly');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$select public.submit_custom_claim('Admin chore')$$, '42501', 'housemates only', 'an admin cannot claim');
select throws_ok($$select public.decide_claim(current_setting('t.custom')::uuid, true)$$, '22023', 'points must be positive',
  'accepting a custom claim needs points');
select throws_ok($$select public.decide_claim(current_setting('t.custom')::uuid, true, -3)$$, '22023', 'points must be positive',
  'a custom claim cannot score negative points');
select lives_ok($$select public.decide_claim(current_setting('t.custom')::uuid, true, 3)$$, 'admin accepts with points');
select is((select points::text || ' ' || title from public.score_entry where claim_id = current_setting('t.custom')::uuid),
  '3 Fixed the shelf', 'the entry keeps the admin''s points and the title');

-- Catalog claims keep catalog points: the admin cannot override them.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select set_config('t.catalog', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$select public.decide_claim(current_setting('t.catalog')::uuid, true, 50)$$, '22023',
  'catalog claims use catalog points', 'points cannot be overridden on a catalog claim');

-- Custom points reach the leaderboard and medals still work with entries that have no deed.
select is((select points from public.leaderboard('this_week') where display_name = 'Ana'), 3::bigint,
  'custom points count on the leaderboard');
select lives_ok($$select * from public.medals()$$, 'medals work with deed-less entries');

select * from finish();
rollback;
