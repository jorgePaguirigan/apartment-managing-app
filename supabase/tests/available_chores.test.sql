-- pgTAP tests for available chores and claiming them any time. Run with `supabase test db`.
begin;
select plan(6);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3');

-- a1 is admin of Casa (Asia/Manila); a2 (Ana) and a3 (Ben) are housemates. One chore, Wednesdays, weight 1.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
reset role;
update public.chore set active = false where household_id = current_setting('t.hh')::uuid; -- drop the preset chores
set local role authenticated;
select set_config('t.mop', public.upsert_chore(null, 'Mop', 'Kitchen', 3, 1, (select id from public.deed where name = 'Cleaned toilet'))::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ben');

-- Tuesday 20 Oct: this week (19 Oct) is already handed out, next week (26 Oct) is still open.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select string_agg(day::text || ' ' || name, ',') from public.available_chores('2026-10-20 10:00+08')),
  '2026-10-28 Mop', 'lists next week''s unassigned chore with its date');

-- Ana claims next week's Mop on a Tuesday, outside the old Thursday to Saturday window.
select set_config('t.next', (select instance_id::text from public.available_chores('2026-10-20 10:00+08')), true);
select lives_ok($$select public.dib_chore(current_setting('t.next')::uuid, '2026-10-20 10:00+08')$$,
  'a housemate claims a chore on a Tuesday');
select is((select assignee::text || source from public.chore_instance where id = current_setting('t.next')::uuid),
  '00000000-0000-0000-0000-0000000000a2dibs', 'it is on her schedule');
select is((select count(*) from public.available_chores('2026-10-20 10:00+08')), 0::bigint, 'a claimed chore leaves the list');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok($$select public.dib_chore(current_setting('t.next')::uuid, '2026-10-20 11:00+08')$$,
  '55000', 'already taken', 'nobody else can take it');

-- Once she says she did it, she cannot release it.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select public.complete_chore(current_setting('t.next')::uuid, null, '2026-10-28 18:00+08');
select throws_ok($$select public.undib_chore(current_setting('t.next')::uuid, '2026-10-28 19:00+08')$$,
  'P0002', 'dib not found', 'a chore already marked done cannot be released');

select * from finish();
rollback;
