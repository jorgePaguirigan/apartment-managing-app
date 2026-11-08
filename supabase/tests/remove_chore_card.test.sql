-- The red X on a schedule card: the admin or the card's assignee removes the chore for good, until its day has passed
-- or it has been claimed. Run with `supabase test db`.
begin;
select plan(8);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2'), ('00000000-0000-0000-0000-0000000000e3');

-- e1 is the admin of Casa, e2 (Ana) and e3 (Ben) are housemates. Casa starts with the preset chores and deeds.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.c1', public.create_invite(), true);
select set_config('t.c2', public.create_invite(), true);
reset role;
update public.chore set active = false where household_id = current_setting('t.hh')::uuid; -- start with an empty schedule
select set_config('t.d1', (select id::text from public.deed where household_id = current_setting('t.hh')::uuid and kind = 'good' order by name offset 0 limit 1), true);
select set_config('t.d2', (select id::text from public.deed where household_id = current_setting('t.hh')::uuid and kind = 'good' order by name offset 1 limit 1), true);
select set_config('t.d3', (select id::text from public.deed where household_id = current_setting('t.hh')::uuid and kind = 'good' order by name offset 2 limit 1), true);
select set_config('t.d4', (select id::text from public.deed where household_id = current_setting('t.hh')::uuid and kind = 'good' order by name offset 3 limit 1), true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select public.join_household(current_setting('t.c1'), 'Ana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select public.join_household(current_setting('t.c2'), 'Ben');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
reset role;

-- Tuesday 2026-10-20 in the household time zone; the week starts Sunday 2026-10-18. Weekday 3 is Wednesday.
select set_config('t.ana', public.add_chore_to_cell_at(current_setting('t.d1')::uuid, 3, '00000000-0000-0000-0000-0000000000e2', '2026-10-18', '2026-10-20 12:00+08')::text, true);
select set_config('t.ben', public.add_chore_to_cell_at(current_setting('t.d2')::uuid, 3, '00000000-0000-0000-0000-0000000000e3', '2026-10-18', '2026-10-20 12:00+08')::text, true);
select set_config('t.adm', public.add_chore_to_cell_at(current_setting('t.d3')::uuid, 3, '00000000-0000-0000-0000-0000000000e2', '2026-10-18', '2026-10-20 12:00+08')::text, true);
select set_config('t.late', public.add_chore_to_cell_at(current_setting('t.d4')::uuid, 3, '00000000-0000-0000-0000-0000000000e2', '2026-10-18', '2026-10-20 12:00+08')::text, true);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select throws_ok($$select public.remove_chore_card_at(current_setting('t.ana')::uuid, '2026-10-20 13:00+08')$$,
  '42501', 'not your chore', 'a housemate cannot remove another housemate''s card');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select public.remove_chore_card_at(current_setting('t.ana')::uuid, '2026-10-20 13:00+08');
select is((select c.active from public.chore_instance i join public.chore c on c.id = i.chore_id where i.id = current_setting('t.ana')::uuid), false,
  'the assignee removes the chore, so it no longer repeats');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select public.remove_chore_card_at(current_setting('t.ben')::uuid, '2026-10-20 13:00+08');
select is((select c.active from public.chore_instance i join public.chore c on c.id = i.chore_id where i.id = current_setting('t.ben')::uuid), false,
  'the admin removes any card');

select throws_ok($$select public.remove_chore_card_at(current_setting('t.late')::uuid, '2026-10-22 09:00+08')$$,
  '55000', 'this chore can no longer be removed', 'a card whose day has passed is locked');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select public.complete_chore(current_setting('t.adm')::uuid, null, '2026-10-21 12:00+08');
select throws_ok($$select public.remove_chore_card_at(current_setting('t.adm')::uuid, '2026-10-21 13:00+08')$$,
  '55000', 'this chore can no longer be removed', 'a claimed card cannot be removed');

select throws_ok($$select public.remove_chore_card_at(gen_random_uuid(), '2026-10-20 13:00+08')$$, 'P0002', 'chore not found', 'an unknown card is not found');
set local role authenticated;
select throws_ok($$select public.remove_chore_card_at(current_setting('t.late')::uuid, '2026-10-20 13:00+08')$$,
  '42501', null, 'clients cannot pass their own clock');
select ok(has_function_privilege('authenticated', 'public.remove_chore_card(uuid)', 'execute'), 'the client-facing function is callable');

select * from finish();
rollback;
