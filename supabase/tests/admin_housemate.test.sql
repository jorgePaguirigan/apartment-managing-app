-- An admin who lives in the apartment can opt in as a housemate; other admins stay unscored.
begin;
select plan(9);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-000000000001');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin C'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;

select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000001')$$, '42501', null,
  'an admin who has not opted in cannot claim');

select lives_ok($$select public.set_also_housemate(true)$$, 'an admin can opt in as a housemate');
select lives_ok($$select set_config('t.claim', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true)$$,
  'an opted-in admin can claim');
select throws_ok($$select public.decide_claim(current_setting('t.claim')::uuid, true)$$, '42501', 'cannot decide your own claim',
  'an admin cannot accept their own claim');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select lives_ok($$select public.decide_claim(current_setting('t.claim')::uuid, true)$$, 'another admin accepts it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select results_eq($$select display_name, points from public.leaderboard('this_week') order by display_name$$,
  $$values ('Admin A'::text, 2::bigint), ('Ana'::text, 0::bigint)$$,
  'the opted-in admin is ranked; the other admin is not');

select lives_ok($$select public.set_also_housemate(false)$$, 'an admin can opt out again');
select is((select count(*) from public.leaderboard('this_week')), 1::bigint, 'opting out removes them from the leaderboard');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select public.set_also_housemate(true)$$, '42501', null, 'a housemate cannot use it');

select * from finish();
rollback;
