-- pgTAP tests for removing a housemate. Run with `supabase test db`.
begin;
select plan(12);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000d3'), ('00000000-0000-0000-0000-0000000000d4');

-- d1 is admin of Casa, d2 (Ana) and d3 (Ben) are housemates. d4 is admin of another household.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
select set_config('t.claim', public.submit_claim((select id from public.deed where name = 'Cooked dinner'))::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ben');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select public.create_household('Other', 'Olga');

-- Ana scores 5 points and holds a chore this week.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select public.award('00000000-0000-0000-0000-0000000000d2', (select id from public.deed where name = 'Cleaned toilet'));
reset role;
insert into public.chore (id, household_id, name, weekday, weight)
  values ('00000000-0000-0000-0000-00000000c401', current_setting('t.hh')::uuid, 'Sweep', 1, 1);
insert into public.chore_instance (household_id, chore_id, week_start, assignee, source)
  values (current_setting('t.hh')::uuid, '00000000-0000-0000-0000-00000000c401',
          date_trunc('week', now() at time zone 'Asia/Manila')::date, '00000000-0000-0000-0000-0000000000d2', 'admin');
set local role authenticated;

-- Only an admin of the same household can remove, and only a housemate.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
select throws_ok($$select public.remove_housemate('00000000-0000-0000-0000-0000000000d2')$$, '42501', 'admin only',
  'a housemate cannot remove anyone');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select throws_ok($$select public.remove_housemate('00000000-0000-0000-0000-0000000000d2')$$, 'P0002', 'housemate not found',
  'an admin of another household cannot remove them');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select throws_ok($$select public.remove_housemate('00000000-0000-0000-0000-0000000000d1')$$, 'P0002', 'housemate not found',
  'an admin cannot be removed this way');

select lives_ok($$select public.remove_housemate('00000000-0000-0000-0000-0000000000d2')$$, 'admin removes Ana');

-- Afterwards: off the leaderboard and the schedule, history kept, pending claim closed.
select is((select count(*) from public.leaderboard('this_week') where member_id = '00000000-0000-0000-0000-0000000000d2'),
  0::bigint, 'removed housemate is off the leaderboard');
select is((select count(*) from public.score_entry where member_id = '00000000-0000-0000-0000-0000000000d2' and deleted_at is null),
  1::bigint, 'their score entries are kept');
select is((select status from public.claim where id = current_setting('t.claim')::uuid), 'rejected',
  'their pending claim is rejected');
select is((select assignee from public.chore_instance where chore_id = '00000000-0000-0000-0000-00000000c401'), null,
  'their chore this week goes back to unassigned');
select throws_ok($$select public.award('00000000-0000-0000-0000-0000000000d2', (select id from public.deed where name = 'Cleaned toilet'))$$,
  null, null, 'a removed housemate cannot be scored');

-- Ana herself sees nothing of the household any more and cannot claim.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select is((select count(*) from public.member where user_id <> auth.uid()), 0::bigint, 'removed housemate reads no household data');
select is((select role from public.member), 'removed', 'removed housemate can still read their own row');
select throws_ok($$select public.submit_claim((select id from public.deed limit 1))$$, null, null,
  'removed housemate cannot submit a claim');

select * from finish();
rollback;
