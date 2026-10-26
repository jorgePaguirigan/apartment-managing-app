-- pgTAP tests for claim emails: what gets queued when a claim is submitted or decided. Run with `supabase test db`.
-- Seams: submit_claim / submit_custom_claim and decide_claim, read back from the notification table.
begin;
select plan(38);

-- Household A: admins Admin A and Admin D, housemates Ana, Ben, Cy. Household B has one admin and one housemate.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-0000000000b0'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin D'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Cy'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good');

-- This week: Ana 3, Ben 4, Cy 3 (Ana and Cy tied). Ana also did Toilet alone last week, so one more Toilet this week makes her Toilet champion.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, d, p, 'admin', '00000000-0000-0000-0000-00000000000a', t
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 3, now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 4, now()),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'dddddddd-0000-0000-0000-000000000002'::uuid, 3, now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-0000-0000-0000-000000000001'::uuid, 5, now() - interval '7 days')
) v(m, d, p, t);
-- Cy already has a 4-week claim streak (last four weeks), so Cy's next claim makes it 5 weeks: the same medal, not a new one.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002', 0,
  'claim', '00000000-0000-0000-0000-00000000000a', now() - (w * interval '7 days')
from generate_series(1, 4) w;

-- A housemate submits a catalog claim and another a custom claim: every admin gets an admin email, no housemate does.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select lives_ok($$select set_config('t.toilet', public.submit_claim('dddddddd-0000-0000-0000-000000000001', 'with bleach')::text, true)$$,
  'Ana submits a Toilet claim');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select lives_ok($$select set_config('t.shelf', public.submit_custom_claim('Fixed the shelf')::text, true)$$,
  'Ben submits a custom claim');

reset role;
select is((select count(*)::int from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.toilet')::uuid), 2,
  'one admin email per admin');
select is(array(select recipient_id from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.toilet')::uuid order by recipient_id),
  array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d']::uuid[],
  'only admins of that household get it, housemates and the other household do not');
select is((select payload from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.toilet')::uuid
             and recipient_id = '00000000-0000-0000-0000-00000000000a'),
  '{"housemate":"Ana","chore":"Toilet","points":5,"note":"with bleach","custom":false}'::jsonb,
  'the admin email names the housemate, deed, points and note');
select is((select payload from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.shelf')::uuid
             and recipient_id = '00000000-0000-0000-0000-00000000000a'),
  '{"housemate":"Ben","chore":"Fixed the shelf","points":null,"note":null,"custom":true}'::jsonb,
  'a custom claim is flagged and has no points yet');

-- Accepting Ana's Toilet claim: Ana 3 -> 8 passes Ben, but only ties Cy before, so Cy is not overtaken.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$select public.decide_claim(current_setting('t.toilet')::uuid, true)$$, 'admin accepts the Toilet claim');

reset role;
select is((select count(*)::int from public.notification where kind = 'housemate_decision' and claim_id = current_setting('t.toilet')::uuid), 3,
  'one housemate email per scored member');
select is(array(select recipient_id from public.notification where kind = 'housemate_decision' and claim_id = current_setting('t.toilet')::uuid order by recipient_id),
  array['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']::uuid[],
  'housemates of that household only: no admin, nobody from household B');
select is((select payload - 'leaderboards' - 'medals' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '{"status":"accepted","actor":"Ana","chore":"Toilet","points":5}'::jsonb, 'the email says who did what for how many points');
select is((select payload #> '{leaderboards,this_week,before}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '[{"name":"Ben","points":4,"rank":1},{"name":"Ana","points":3,"rank":2},{"name":"Cy","points":3,"rank":2}]'::jsonb,
  'this week before the claim, ties share a rank and the admins are not ranked');
select is((select payload #> '{leaderboards,this_week,after}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '[{"name":"Ana","points":8,"rank":1},{"name":"Ben","points":4,"rank":2},{"name":"Cy","points":3,"rank":3}]'::jsonb,
  'this week after the claim');
select is((select payload #> '{leaderboards,this_week,overtaken}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '[{"name":"Ben","by":"Ana"}]'::jsonb, 'Ben was overtaken; Cy, who was only tied with Ana, was not');
select is((select payload -> 'medals' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  '{"gained":[{"member":"Ana","label":"Toilet champion"}],"lost":[]}'::jsonb,
  'Ana gained Toilet champion because of this claim');
select is((select jsonb_array_length(payload #> '{leaderboards,this_month,before}') * 10 + jsonb_array_length(payload #> '{leaderboards,this_month,after}')
             from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000002'),
  33, 'the month leaderboards are in the email too');

-- Cy's Dishes claim lifts Cy only to a tie with Ben: nobody is overtaken and no medal changes hands.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select lives_ok($$select set_config('t.cy1', public.submit_claim('dddddddd-0000-0000-0000-000000000002')::text, true)$$, 'Cy submits a Dishes claim');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$select public.decide_claim(current_setting('t.cy1')::uuid, true)$$, 'admin accepts it');

reset role;
select is((select payload #> '{leaderboards,this_week,overtaken}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.cy1')::uuid and recipient_id = '00000000-0000-0000-0000-000000000001'),
  '[]'::jsonb, 'reaching a tie overtakes nobody');
select is((select payload -> 'medals' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.cy1')::uuid and recipient_id = '00000000-0000-0000-0000-000000000001'),
  '{"gained":[],"lost":[]}'::jsonb, 'no medal changed: a 4-week streak growing to 5 weeks is the same medal');

-- Rejecting Ben's custom claim: a short email with no ranks or medals.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$select public.decide_claim(current_setting('t.shelf')::uuid, false)$$, 'admin rejects the custom claim');

reset role;
select is((select payload from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.shelf')::uuid and recipient_id = '00000000-0000-0000-0000-000000000003'),
  '{"status":"rejected","actor":"Ben","chore":"Fixed the shelf"}'::jsonb, 'a rejection carries no points, ranks or medals');
select is((select count(*)::int from public.notification where kind = 'housemate_decision' and claim_id = current_setting('t.shelf')::uuid), 3,
  'and still goes to every scored member');

-- Ben also does Toilet this week, so Ana is no longer the only one: she loses Toilet champion, and Ben (9) passes Ana (8).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select lives_ok($$select set_config('t.ben_toilet', public.submit_claim('dddddddd-0000-0000-0000-000000000001')::text, true)$$, 'Ben submits a Toilet claim');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select lives_ok($$select public.decide_claim(current_setting('t.ben_toilet')::uuid, true)$$, 'the other admin accepts it');

reset role;
select is((select payload #> '{leaderboards,this_week,overtaken}' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.ben_toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000001'),
  '[{"name":"Ana","by":"Ben"}]'::jsonb, 'Ana was overtaken by Ben; Cy, only tied with Ben before, was not');
select is((select payload -> 'medals' from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.ben_toilet')::uuid and recipient_id = '00000000-0000-0000-0000-000000000001'),
  '{"gained":[],"lost":[{"member":"Ana","label":"Toilet champion"}]}'::jsonb, 'Ana lost Toilet champion because of this claim');

-- An admin who opted in as a housemate is scored: they get the admin email for their own claim and the housemate emails.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$select public.set_also_housemate(true)$$, 'Admin A opts in as a housemate');
select lives_ok($$select set_config('t.a_dishes', public.submit_claim('dddddddd-0000-0000-0000-000000000002')::text, true)$$, 'Admin A submits a claim');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select lives_ok($$select set_config('t.cy2', public.submit_claim('dddddddd-0000-0000-0000-000000000002')::text, true)$$, 'Cy submits another Dishes claim');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select lives_ok($$select public.decide_claim(current_setting('t.cy2')::uuid, true)$$, 'Admin D accepts it');

reset role;
select is(array(select recipient_id from public.notification where kind = 'admin_claim' and claim_id = current_setting('t.a_dishes')::uuid order by recipient_id),
  array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d']::uuid[],
  'an admin who claims is emailed as an admin about their own claim');
select is((select count(*)::int from public.notification where kind = 'housemate_decision' and claim_id = current_setting('t.cy2')::uuid), 4,
  'and is emailed as a housemate once opted in');
select is((select jsonb_array_length(payload #> '{leaderboards,this_week,after}') from public.notification where kind = 'housemate_decision'
             and claim_id = current_setting('t.cy2')::uuid and recipient_id = '00000000-0000-0000-0000-00000000000a'),
  4, 'and is on the leaderboard in it');

-- Claims the system rejects when a deed is deleted are not decisions: no email.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select lives_ok($$select public.delete_deed('dddddddd-0000-0000-0000-000000000002')$$, 'Admin D deletes the Dishes deed, rejecting waiting claims');
reset role;
select is((select count(*)::int from public.notification where kind = 'housemate_decision' and claim_id = current_setting('t.a_dishes')::uuid), 0,
  'a claim rejected by deleting its deed sends no housemate email');

-- The table is closed to clients.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select * from public.notification$$, '42501', 'permission denied for table notification', 'a housemate cannot read notifications');
select throws_ok($$insert into public.notification (household_id, kind, claim_id, recipient_id, payload) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'admin_claim', null, '00000000-0000-0000-0000-000000000001', '{}')$$, '42501',
  'permission denied for table notification', 'a housemate cannot write notifications');
set local role anon;
select throws_ok($$select * from public.notification$$, '42501', 'permission denied for table notification', 'anon cannot read notifications');

select * from finish();
rollback;
