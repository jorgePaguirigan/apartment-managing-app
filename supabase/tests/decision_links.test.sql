-- pgTAP tests for the decision links in admin emails: a single-use token lets an admin accept or reject one claim
-- without signing in. Run with `supabase test db`.
begin;
select plan(32);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-0000000000b0');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin D'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good');
-- c1 Ana Toilet, c2 Ana Dishes, c3 Ben Toilet, c4 Ben Dishes, c5 Ben custom.
insert into public.claim (id, household_id, member_id, deed_id, title, note) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', null, 'with bleach'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', null, null),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', null, null),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', null, null),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', null, 'Fixed the shelf', null);

-- Issuing a token: the sender (service role) only, for an admin of the claim's household.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', 'permission denied for function issue_decision_token', 'a signed-in user cannot issue tokens');
select throws_ok($$select * from public.decision_token$$, '42501', 'permission denied for table decision_token', 'nor read them');
set local role anon;
select throws_ok($$select public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', 'permission denied for function issue_decision_token', 'a visitor cannot issue tokens');
set local role service_role;
select lives_ok($$select set_config('t.tok1', public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'), true)$$,
  'the service role issues a token for Admin A');
select lives_ok($$select set_config('t.tok1d', public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d'), true)$$,
  'and one for Admin D, for the same claim');
reset role;
select is(length(current_setting('t.tok1')), 64, 'a token is 64 characters');
select isnt(current_setting('t.tok1'), current_setting('t.tok1d'), 'every token is different');
select is((select count(*)::int from public.decision_token where encode(token_hash, 'hex') = current_setting('t.tok1')), 0,
  'the token itself is not stored');
select is((select count(*)::int from public.decision_token
            where token_hash = sha256(convert_to(current_setting('t.tok1'), 'utf8'))), 1, 'only its hash is');
select throws_ok($$select public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')$$,
  '42501', 'admin only', 'a housemate cannot be given a token');
select throws_ok($$select public.issue_decision_token('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b0')$$,
  '42501', 'admin only', 'nor an admin of another household');

-- Reading a link shows the claim and changes nothing.
set local role anon;
select is((select housemate || '/' || chore || '/' || points || '/' || custom::text || '/' || status || '/' || household
           from public.claim_for_token(current_setting('t.tok1'))),
  'Ana/Toilet/5/false/pending/A', 'a visitor with the token sees who, what, points and state');
select is((select count(*)::int from public.claim_for_token('not-a-token')), 0, 'an unknown token shows nothing');
reset role;
select is((select status from public.claim where id = 'cccccccc-0000-0000-0000-000000000001'), 'pending', 'reading the link decided nothing');

-- Deciding with the token.
set local role anon;
select throws_ok($$select public.decide_claim_by_token('not-a-token', true)$$, 'P0002', 'link not valid', 'an unknown token decides nothing');
select lives_ok($$select public.decide_claim_by_token(current_setting('t.tok1'), true)$$, 'Admin A accepts with the link, signed out');
reset role;
select is((select status || '/' || decided_by from public.claim where id = 'cccccccc-0000-0000-0000-000000000001'),
  'accepted/00000000-0000-0000-0000-00000000000a', 'the claim is accepted, decided by the admin the link was for');
select is((select points::text || '/' || approved_by from public.score_entry where claim_id = 'cccccccc-0000-0000-0000-000000000001'),
  '5/00000000-0000-0000-0000-00000000000a', 'the entry copies the deed points');
select is((select count(*)::int from public.notification
            where kind = 'housemate_decision' and claim_id = 'cccccccc-0000-0000-0000-000000000001'), 2,
  'the housemates are emailed, as with an in-app decision');
set local role anon;
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok1'), true)$$, '55000', 'claim already decided', 'a link works once');
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok1d'), false)$$, '55000', 'claim already decided',
  'the other admin''s link for the same claim is then spent too');
select is((select status from public.claim_for_token(current_setting('t.tok1d'))), 'accepted', 'and shows how it was decided');

-- Reject, expiry, an in-app decision first, a demoted admin and a custom claim.
set local role service_role;
select lives_ok($$select set_config('t.tok2', public.issue_decision_token('cccccccc-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000d'), true)$$,
  'a token for the Dishes claim');
reset role;
update public.decision_token set expires_at = now() - interval '1 second'
  where token_hash = sha256(convert_to(current_setting('t.tok2'), 'utf8'));
set local role anon;
select is((select count(*)::int from public.claim_for_token(current_setting('t.tok2'))), 0, 'an expired link shows nothing');
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok2'), false)$$, 'P0002', 'link not valid', 'and decides nothing');

reset role;
update public.decision_token set expires_at = now() + interval '1 day'
  where token_hash = sha256(convert_to(current_setting('t.tok2'), 'utf8'));
set local role anon;
select lives_ok($$select public.decide_claim_by_token(current_setting('t.tok2'), false)$$, 'Admin D rejects with the link');
reset role;
select is((select status || '/' || (select count(*) from public.score_entry where claim_id = c.id)::text from public.claim c
           where c.id = 'cccccccc-0000-0000-0000-000000000002'), 'rejected/0', 'a rejection scores nothing');

set local role service_role;
do $$ begin perform set_config('t.tok3', public.issue_decision_token('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a'), true); end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin perform public.decide_claim('cccccccc-0000-0000-0000-000000000003', true); end $$;
set local role anon;
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok3'), false)$$, '55000', 'claim already decided',
  'a claim already decided in the app cannot be decided again by link');

reset role;
set local role service_role;
do $$ begin perform set_config('t.tok4', public.issue_decision_token('cccccccc-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a'), true); end $$;
reset role;
set local role anon;
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok4'), true)$$, '22023', 'points must be positive',
  'a custom claim cannot be accepted by link: the admin must type its points');
select is((select custom::text || '/' || status from public.claim_for_token(current_setting('t.tok4'))), 'true/pending', 'it is flagged custom and still waiting');
select lives_ok($$select public.decide_claim_by_token(current_setting('t.tok4'), false)$$, 'but it can be rejected by link');

reset role;
set local role service_role;
do $$ begin perform set_config('t.tok5', public.issue_decision_token('cccccccc-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000d'), true); end $$;
reset role;
update public.member set role = 'housemate' where user_id = '00000000-0000-0000-0000-00000000000d';
set local role anon;
select throws_ok($$select public.decide_claim_by_token(current_setting('t.tok5'), true)$$, '42501', 'admin only',
  'a link no longer works once its admin is not an admin');

select * from finish();
rollback;
