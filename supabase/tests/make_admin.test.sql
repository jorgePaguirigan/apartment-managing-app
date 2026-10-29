-- An admin can promote a housemate. The promoted admin stays scored and can decide others' claims, never their own.
begin;
select plan(8);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Other house');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

-- A housemate cannot promote anyone, themselves included.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$select public.make_admin('00000000-0000-0000-0000-000000000001')$$, '42501', null, 'a housemate cannot make themselves admin');

-- The admin promotes Ana.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$select public.make_admin('00000000-0000-0000-0000-0000000000b1')$$, '22023', null, 'the target must be in this household');
select throws_ok($$select public.make_admin('00000000-0000-0000-0000-00000000000a')$$, '22023', null, 'the target must be a housemate');
select lives_ok($$select public.make_admin('00000000-0000-0000-0000-000000000001')$$, 'an admin can make a housemate an admin');

-- Ana is now an admin who is still scored.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select count(*) from public.leaderboard('this_week') where display_name = 'Ana'), 1::bigint, 'the promoted admin stays on the leaderboard');
select lives_ok($$select set_config('t.own', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true)$$, 'the promoted admin can still claim');
select throws_ok($$select public.decide_claim(current_setting('t.own')::uuid, true)$$, '42501', 'cannot decide your own claim',
  'the promoted admin cannot decide their own claim');

-- Ben, still a housemate, files a claim that Ana (now admin) can decide.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select set_config('t.ben', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select lives_ok($$select public.decide_claim(current_setting('t.ben')::uuid, true)$$, 'the promoted admin can score a housemate''s claim');

select * from finish();
rollback;
