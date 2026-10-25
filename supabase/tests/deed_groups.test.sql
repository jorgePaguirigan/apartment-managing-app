-- pgTAP tests for catalog groups. Run with `supabase test db`.
begin;
select plan(6);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2'), ('00000000-0000-0000-0000-0000000000f3');

-- f1 is admin of Casa with housemate f2. f3 is admin of another household with its own group.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
set local role authenticated;
select set_config('t.other', public.create_household('Other', 'Olga')::text, true);
insert into public.deed_group (id, household_id, name) values ('00000000-0000-0000-0000-00000000a003', current_setting('t.other')::uuid, 'Theirs');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
select set_config('t.deed', (select id from public.deed where name = 'Cooked dinner')::text, true);

select lives_ok($$insert into public.deed_group (id, household_id, name) values ('00000000-0000-0000-0000-00000000a001', current_setting('t.hh')::uuid, 'Kitchen')$$,
  'admin adds a group');
select lives_ok($$update public.deed set group_id = '00000000-0000-0000-0000-00000000a001' where id = current_setting('t.deed')::uuid$$,
  'admin moves a deed into it');
select is((select g.name from public.deed d join public.deed_group g on g.id = d.group_id where d.id = current_setting('t.deed')::uuid),
  'Kitchen', 'the deed is in Kitchen');
select throws_ok($$update public.deed set group_id = '00000000-0000-0000-0000-00000000a003' where id = current_setting('t.deed')::uuid$$,
  '23503', null, 'a deed cannot join another household''s group');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');
select throws_ok($$insert into public.deed_group (household_id, name) values (current_setting('t.hh')::uuid, 'Mine')$$,
  '42501', null, 'a housemate cannot add a group');
select is((select count(*) from public.deed_group), 1::bigint, 'a housemate sees only their household''s groups');

select * from finish();
rollback;
