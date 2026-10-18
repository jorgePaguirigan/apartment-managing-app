-- pgTAP tests for invites and create_household. Run with `supabase test db`.
begin;
select plan(9);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000c3');

-- c1 creates a household: becomes admin, catalog is seeded; bad time zone and double create fail.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select lives_ok($$select set_config('t.hh', public.create_household('Casa', 'Jorge')::text, true)$$,
  'create_household works');
select is((select role from public.member), 'admin', 'creator is an admin');
select is((select count(*) from public.deed), 5::bigint, 'default catalog is seeded');
select throws_ok($$select public.create_household('Again', 'Jorge')$$, '55000', 'already in a household',
  'cannot create a second household');
select lives_ok($$select set_config('t.code', public.create_invite()::text, true)$$, 'admin creates an invite');

-- c2 joins with the code as a housemate; cannot read invites or create one.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select lives_ok($$select public.join_household(current_setting('t.code'), 'Ana')$$, 'housemate joins with the code');
select throws_ok($$select public.create_invite()$$, '42501', 'admin only', 'housemate cannot create invites');

-- c1 revokes the code; c3 can no longer join with it.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select public.revoke_invite(current_setting('t.code'));
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
select throws_ok($$select public.join_household(current_setting('t.code'), 'Cy')$$, 'P0002', 'invite not found',
  'revoked code is rejected');

-- bad time zone is rejected before anything is created.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok($$select public.create_household('X', 'Cy', 'Not/AZone')$$, '22023', null,
  'unknown time zone is rejected');

select * from finish();
rollback;
