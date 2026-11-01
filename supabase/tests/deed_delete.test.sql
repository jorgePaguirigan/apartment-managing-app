-- pgTAP tests for deleting a catalog deed. Run with `supabase test db`.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2'), ('00000000-0000-0000-0000-0000000000e3');

-- e1 is admin of Casa with housemate e2 (Ana). e3 is admin of another household.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.deed', (select id from public.deed where name = 'Cooked dinner')::text, true);
select set_config('t.code', public.create_invite(), true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
select set_config('t.claim', public.submit_claim(current_setting('t.deed')::uuid)::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select public.create_household('Other', 'Olga');

-- Ana already scored the deed once; a chore files claims for it.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select public.award('00000000-0000-0000-0000-0000000000e2', current_setting('t.deed')::uuid);
reset role;
insert into public.chore (id, household_id, name, weekday, deed_id)
  values ('00000000-0000-0000-0000-00000000c501', current_setting('t.hh')::uuid, 'Cook', 1, current_setting('t.deed')::uuid);
set local role authenticated;
select set_config('t.before', (select points::text from public.leaderboard('this_week') where display_name = 'Ana'), true);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok($$select public.delete_deed(current_setting('t.deed')::uuid)$$, '42501', 'admin only',
  'a housemate cannot delete a deed');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select throws_ok($$select public.delete_deed(current_setting('t.deed')::uuid)$$, 'P0002', 'deed not found',
  'an admin of another household cannot delete it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select lives_ok($$select public.delete_deed(current_setting('t.deed')::uuid)$$, 'admin deletes the deed');

select is((select count(*) from public.deed where deleted_at is null and id = current_setting('t.deed')::uuid), 0::bigint,
  'it is gone from the catalog');
select is((select points::text from public.leaderboard('this_week') where display_name = 'Ana'), current_setting('t.before'),
  'totals are unchanged');
select is((select d.name from public.score_entry s join public.deed d on d.id = s.deed_id where s.member_id = '00000000-0000-0000-0000-0000000000e2'),
  'Cooked dinner', 'past entries still show the deed name');
select is((select status from public.claim where id = current_setting('t.claim')::uuid), 'rejected',
  'a claim waiting on it is rejected');
select is((select deed_id from public.chore where id = '00000000-0000-0000-0000-00000000c501'), null,
  'chores no longer file claims for it');
select throws_ok($$select public.award('00000000-0000-0000-0000-0000000000e2', current_setting('t.deed')::uuid)$$, null, null,
  'it cannot be awarded any more');
update public.deed set active = true where id = current_setting('t.deed')::uuid;
select is((select active from public.deed where id = current_setting('t.deed')::uuid), false,
  'a direct catalog edit cannot bring it back');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok($$select public.submit_claim(current_setting('t.deed')::uuid)$$, null, null,
  'it cannot be claimed any more');

select * from finish();
rollback;
