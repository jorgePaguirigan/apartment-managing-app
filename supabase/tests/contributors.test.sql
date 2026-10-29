-- A claim can name contributors. Accepting scores the deed's full points once per person; the emails count every entry of the claim.
-- Seams: submit_claim / submit_custom_claim, decide_claim and delete_entry, read back through score_entry, leaderboard and the notification table.
begin;
select plan(28);

-- Household A: admin Admin A, housemates Ana, Ben, Cy. Household B has one housemate, Bea.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Cy'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good');
-- Ben already has 4 points this week.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by)
values ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 4, 'admin',
        '00000000-0000-0000-0000-00000000000a');

-- Ana claims Toilet with Ben and Cy.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select lives_ok($$select set_config('t.c1', public.submit_claim('dddddddd-0000-0000-0000-000000000001', null,
  array['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']::uuid[])::text, true)$$,
  'a housemate can claim with contributors');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000002', null, array['00000000-0000-0000-0000-0000000000b1']::uuid[])$$,
  '22023', null, 'a contributor from another household is refused');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000002', null,
  array['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002']::uuid[])$$,
  '22023', null, 'a contributor can be listed only once');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000002', null, array['00000000-0000-0000-0000-000000000001']::uuid[])$$,
  '22023', null, 'the claimer is already counted, so cannot be listed');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000002', null, array['00000000-0000-0000-0000-00000000000a']::uuid[])$$,
  '22023', null, 'an admin who is not a housemate cannot be a contributor');
select throws_ok($$select public.submit_claim('dddddddd-0000-0000-0000-000000000002', null,
  array['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1']::uuid[])$$,
  '22023', null, 'a claim never has more people than the household has housemates');
select throws_ok($$insert into public.claim_contributor (claim_id, member_id) values (current_setting('t.c1')::uuid, '00000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'a client cannot write contributors directly');

-- Ben claims a custom deed with Cy; Cy claims Dishes with Ana; Ben claims Dishes alone.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select lives_ok($$select set_config('t.c2', public.submit_custom_claim('Fixed shelf', null, array['00000000-0000-0000-0000-000000000003']::uuid[])::text, true)$$,
  'a custom claim takes contributors too');
select lives_ok($$select set_config('t.c4', public.submit_claim('dddddddd-0000-0000-0000-000000000002')::text, true)$$, 'a claim without contributors still works');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select lives_ok($$select set_config('t.c3', public.submit_claim('dddddddd-0000-0000-0000-000000000002', null, array['00000000-0000-0000-0000-000000000001']::uuid[])::text, true)$$,
  'Cy files a claim with Ana');

-- The admin sees the contributors and accepts the Toilet claim.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select is(array(select member_id from public.claim_contributor where claim_id = current_setting('t.c1')::uuid order by member_id),
  array['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']::uuid[], 'the admin can read the contributors');
select lives_ok($$select public.decide_claim(current_setting('t.c1')::uuid, true)$$, 'the admin accepts the claim');
select results_eq($$select member_id, points from public.score_entry where claim_id = current_setting('t.c1')::uuid order by member_id$$,
  $$values ('00000000-0000-0000-0000-000000000001'::uuid, 5), ('00000000-0000-0000-0000-000000000002'::uuid, 5), ('00000000-0000-0000-0000-000000000003'::uuid, 5)$$,
  'one entry per person, each with the full points');
select results_eq($$select display_name, points from public.leaderboard('this_week') order by display_name$$,
  $$values ('Ana'::text, 5::bigint), ('Ben'::text, 9::bigint), ('Cy'::text, 5::bigint)$$, 'everyone moves on the leaderboard');

-- Deleting one person's entry leaves the others.
select lives_ok($$select public.delete_entry((select id from public.score_entry
  where claim_id = current_setting('t.c1')::uuid and member_id = '00000000-0000-0000-0000-000000000003'))$$, 'the admin deletes Cy''s entry');
select results_eq($$select display_name, points from public.leaderboard('this_week') order by display_name$$,
  $$values ('Ana'::text, 5::bigint), ('Ben'::text, 9::bigint), ('Cy'::text, 0::bigint)$$, 'only Cy lost the points');

-- Rejecting scores nobody.
select lives_ok($$select public.decide_claim(current_setting('t.c3')::uuid, false)$$, 'the admin rejects Cy''s claim');
select is((select count(*) from public.score_entry where claim_id = current_setting('t.c3')::uuid), 0::bigint, 'a rejected claim scores nobody');

-- A contributor removed before the decision gets nothing.
select lives_ok($$select public.remove_housemate('00000000-0000-0000-0000-000000000003')$$, 'the admin removes Cy');
select lives_ok($$select public.decide_claim(current_setting('t.c2')::uuid, true, 3)$$, 'the admin accepts the custom claim');
select results_eq($$select member_id, points from public.score_entry where claim_id = current_setting('t.c2')::uuid$$,
  $$values ('00000000-0000-0000-0000-000000000002'::uuid, 3)$$, 'a removed contributor scores nothing');

-- Later deed edits never change the entries; the emails count every entry of the claim.
-- A contributor sees the claim as if they had claimed it; others see none of it.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select results_eq($$select title, status, points, claimer from public.my_contributions()$$,
  $$values ('Toilet'::text, 'accepted'::text, 5, 'Ana'::text)$$, 'a contributor sees the accepted claim with their own points');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select results_eq($$select title, status, points, claimer from public.my_contributions()$$,
  $$values ('Dishes'::text, 'rejected'::text, 0, 'Cy'::text)$$, 'a rejected claim shows as rejected, with no points');

reset role;
update public.deed set points = 9 where id = 'dddddddd-0000-0000-0000-000000000001';
select is((select max(points) from public.score_entry where claim_id = current_setting('t.c1')::uuid), 5, 'a later deed edit changes nothing');
select is((select payload -> 'contributors' from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.c1')::uuid),
  '["Ben","Cy"]'::jsonb, 'the admin email names the contributors');
select is((select payload - 'leaderboards' - 'medals' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.c1')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '{"status":"accepted","actor":"Ana","contributors":["Ben","Cy"],"chore":"Toilet","points":5}'::jsonb, 'the housemate email names the contributors');
select is((select payload #> '{leaderboards,this_week,before}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.c1')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '[{"name":"Ben","points":4,"rank":1},{"name":"Ana","points":0,"rank":2},{"name":"Cy","points":0,"rank":2}]'::jsonb,
  'the standings before the claim leave out every entry of the claim, not only Ana''s');
select is((select payload -> 'contributors' from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.c4')::uuid), null,
  'a claim without contributors adds nothing to the email');

select * from finish();
rollback;
