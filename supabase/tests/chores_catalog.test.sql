-- pgTAP tests for building the schedule from the deed catalog. Run with `supabase test db`.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2');

-- f1 is admin of Casa, f2 a housemate. Casa starts with the preset chores and deeds.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
reset role;
update public.chore set active = false where household_id = current_setting('t.hh')::uuid; -- start with an empty schedule
insert into public.deed_group (id, household_id, name) values ('00000000-0000-0000-0000-00000000f0a1', current_setting('t.hh')::uuid, 'Bathroom');
update public.deed set group_id = '00000000-0000-0000-0000-00000000f0a1' where name = 'Cleaned toilet';
set local role authenticated;
select set_config('t.toilet', (select id::text from public.deed where name = 'Cleaned toilet'), true);
select set_config('t.penalty', (select id::text from public.deed where kind = 'penalty' limit 1), true);

select set_config('t.chore', public.add_chore_from_deed(current_setting('t.toilet')::uuid, 3)::text, true);
select is((select name || '|' || area || '|' || weekday from public.chore where id = current_setting('t.chore')::uuid), 'Cleaned toilet|Bathroom|3',
  'adding a catalog deed schedules a chore with the deed''s name, its group as the area, and the day');
select throws_ok($$select public.add_chore_from_deed(current_setting('t.toilet')::uuid, 3)$$, '55000', 'already on the schedule', 'the same deed on the same day cannot be added twice');
select lives_ok($$select public.add_chore_from_deed(current_setting('t.toilet')::uuid, 5)$$, 'the same deed can be added on another day');
select throws_ok($$select public.add_chore_from_deed(current_setting('t.penalty')::uuid, 3)$$, 'P0002', 'deed not found', 'a penalty cannot be scheduled');
select throws_ok($$select public.add_chore_from_deed(current_setting('t.toilet')::uuid, 8)$$, '22023', 'invalid weekday', 'the day must be 1 to 7');

select public.remove_chore(current_setting('t.chore')::uuid);
select is((select active from public.chore where id = current_setting('t.chore')::uuid), false, 'removing a chore takes it off the schedule');
select is(public.add_chore_from_deed(current_setting('t.toilet')::uuid, 3), current_setting('t.chore')::uuid,
  'adding it back on the same day reactivates the same chore, so its turn history is kept');
select is((select active from public.chore where id = current_setting('t.chore')::uuid), true, 'and it is on the schedule again');

reset role;
update public.deed set active = false where id = current_setting('t.toilet')::uuid;
set local role authenticated;
select throws_ok($$select public.add_chore_from_deed(current_setting('t.toilet')::uuid, 6)$$, 'P0002', 'deed not found', 'a deleted deed cannot be scheduled');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
select throws_ok($$select public.add_chore_from_deed(current_setting('t.toilet')::uuid, 1)$$, '42501', 'admin only', 'a housemate cannot add a chore');
select throws_ok($$select public.remove_chore(current_setting('t.chore')::uuid)$$, '42501', 'admin only', 'a housemate cannot remove a chore');

select * from finish();
rollback;
