-- An admin who also lives there is a scored member: a chore card can be dragged to them. Run with `supabase test db`.
begin;
select plan(3);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
reset role;
update public.chore set active = false where household_id = current_setting('t.hh')::uuid;
set local role authenticated;
select set_config('t.chore', public.add_chore_from_deed((select id from public.deed where name = 'Cleaned toilet'), 3)::text, true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select public.generate_week('2026-10-18', '2026-10-13 12:00+08');
select set_config('t.i', (select id::text from public.chore_instance where chore_id = current_setting('t.chore')::uuid and week_start = '2026-10-18'), true);

select throws_ok($$select public.assign_chore(current_setting('t.i')::uuid, '00000000-0000-0000-0000-0000000000c1', '2026-10-20 12:00+08')$$,
  '22023', 'target must be a housemate in this household', 'an admin who does not live there is never given a chore');
reset role;
update public.member set also_housemate = true where user_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select lives_ok($$select public.assign_chore(current_setting('t.i')::uuid, '00000000-0000-0000-0000-0000000000c1', '2026-10-20 12:00+08')$$,
  'an admin who also lives there can be given a chore');
select is((select assignee from public.chore_instance where id = current_setting('t.i')::uuid), '00000000-0000-0000-0000-0000000000c1'::uuid, 'and the chore is theirs');

select * from finish();
rollback;
