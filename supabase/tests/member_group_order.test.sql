-- pgTAP tests for a member's own order of catalog groups. Run with `supabase test db`.
begin;
select plan(7);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000b1'), ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000b3'), ('00000000-0000-0000-0000-0000000000b4');

-- b1 is admin of Casa with groups Kitchen then Laundry; b2 (Ana) and b3 (Ben) are housemates. b4 runs another household.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';
set local role authenticated;
select set_config('t.other', public.create_household('Other', 'Olga')::text, true);
insert into public.deed_group (id, household_id, name) values ('00000000-0000-0000-0000-00000000b003', current_setting('t.other')::uuid, 'Theirs');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true);
select set_config('t.code', public.create_invite(), true);
insert into public.deed_group (id, household_id, name, position) values
  ('00000000-0000-0000-0000-00000000b001', current_setting('t.hh')::uuid, 'Kitchen', 0),
  ('00000000-0000-0000-0000-00000000b002', current_setting('t.hh')::uuid, 'Laundry', 1);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ben');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select public.join_household(current_setting('t.code'), 'Ana');

-- Ana puts Laundry first, for herself only.
select lives_ok($$select public.set_my_group_order(array['00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000b001']::uuid[])$$,
  'a housemate saves her own group order');
select is((select string_agg(g.name, ',' order by o.position) from public.member_group_order o join public.deed_group g on g.id = o.group_id),
  'Laundry,Kitchen', 'she reads back her order');
select lives_ok($$select public.set_my_group_order(array['00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b002']::uuid[])$$,
  'saving again replaces it');
select is((select string_agg(g.name, ',' order by o.position) from public.member_group_order o join public.deed_group g on g.id = o.group_id),
  'Kitchen,Laundry', 'the new order wins');
select throws_ok($$select public.set_my_group_order(array['00000000-0000-0000-0000-00000000b003']::uuid[])$$,
  'P0002', 'group not found', 'another household''s group is refused');

-- Nobody else sees it, and the admin's catalog order is untouched.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select is((select count(*) from public.member_group_order), 0::bigint, 'another housemate cannot read her order');
select is((select string_agg(name, ',' order by position) from public.deed_group), 'Kitchen,Laundry', 'the admin''s catalog order is unchanged');

select * from finish();
rollback;
