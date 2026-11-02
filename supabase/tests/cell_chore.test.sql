-- Pressing a cell on the board adds a catalog chore on that day and gives this week's card to that row's person.
-- Run with `supabase test db`.
begin;
select plan(11);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2');

-- d1 is the admin of Casa (not a housemate), d2 joins as a housemate. Casa starts with the preset chores and deeds.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
reset role;
update public.chore set active = false where household_id = current_setting('t.hh')::uuid; -- start with an empty schedule
set local role authenticated;
select set_config('t.toilet', (select id::text from public.deed where name = 'Cleaned toilet'), true);
select set_config('t.other', (select id::text from public.deed where kind = 'good' and name <> 'Cleaned toilet' order by name limit 1), true);
select set_config('t.third', (select id::text from public.deed where kind = 'good' and name <> 'Cleaned toilet' order by name offset 1 limit 1), true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

reset role; -- the timed version is not callable by clients; its claims still say who is calling
-- Tuesday 2026-10-20 in the household time zone; the week starts Sunday 2026-10-18. Weekday 3 is Wednesday, 1 is Monday.
select set_config('t.i', public.add_chore_to_cell_at(current_setting('t.toilet')::uuid, 3, '00000000-0000-0000-0000-0000000000d2', '2026-10-18', '2026-10-20 12:00+08')::text, true);
select is((select c.name || '|' || c.weekday from public.chore_instance i join public.chore c on c.id = i.chore_id where i.id = current_setting('t.i')::uuid),
  'Cleaned toilet|3', 'pressing a cell schedules the catalog deed as a chore on that day');
select is((select assignee from public.chore_instance where id = current_setting('t.i')::uuid), '00000000-0000-0000-0000-0000000000d2'::uuid, 'and this week''s card is the row''s person''s');
select is((select source from public.chore_instance where id = current_setting('t.i')::uuid), 'admin', 'handed out by the admin, not by the queue');

select set_config('t.u', public.add_chore_to_cell_at(current_setting('t.other')::uuid, 3, null, '2026-10-18', '2026-10-20 12:00+08')::text, true);
select is((select coalesce(assignee::text, 'none') || '|' || held_open from public.chore_instance where id = current_setting('t.u')::uuid), 'none|true',
  'the Unassigned row leaves the card unassigned and the Sunday allocation skips it');

select throws_ok($$select public.add_chore_to_cell_at(current_setting('t.toilet')::uuid, 3, null, '2026-10-18', '2026-10-20 12:00+08')$$,
  '55000', 'already on the schedule', 'a deed is on a day once');
select throws_ok($$select public.add_chore_to_cell_at(current_setting('t.toilet')::uuid, 1, '00000000-0000-0000-0000-0000000000d2', '2026-10-18', '2026-10-20 12:00+08')$$,
  '55000', 'this chore would start on a day that has passed', 'a day that has passed is refused');
select throws_ok($$select public.add_chore_to_cell_at(current_setting('t.third')::uuid, 1, null, '2026-10-25', '2026-10-20 12:00+08')$$,
  '55000', 'this chore would start on a day that has passed', 'from the Next week view too: the chore repeats, so this week''s Monday would be a past-day card');
select lives_ok($$select public.add_chore_to_cell_at(current_setting('t.third')::uuid, 5, null, '2026-10-25', '2026-10-20 12:00+08')$$, 'a later day of this week can be added from the Next week view');
select is((select count(*)::int from public.chore where deed_id = current_setting('t.toilet')::uuid and weekday = 1), 0, 'and the refused call leaves no chore behind');

set local role authenticated;
select throws_ok($$select public.add_chore_to_cell_at(current_setting('t.other')::uuid, 5, null, '2026-10-18', '2026-10-20 12:00+08')$$,
  '42501', null, 'clients cannot pass their own clock');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok($$select public.add_chore_to_cell(current_setting('t.other')::uuid, 5, null, '2026-10-18')$$,
  '42501', 'admin only', 'a housemate cannot add a chore');

select * from finish();
rollback;
