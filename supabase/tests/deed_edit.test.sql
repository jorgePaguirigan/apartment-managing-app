-- Editing a catalog deed never changes points already scored; only admins may edit.
begin;
select plan(4);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select public.award('00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001');

select lives_ok($$update public.deed set name = 'Wash dishes', points = 9 where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'admin can edit a deed');
select is((select points from public.score_entry), 2, 'the past entry keeps the old points');
select is((select name from public.deed), 'Wash dishes', 'the edit applied');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update public.deed set points = 100;
reset role;
select is((select points from public.deed), 9, 'a housemate edit is filtered out by row-level security');

select * from finish();
rollback;
