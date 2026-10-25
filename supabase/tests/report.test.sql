-- pgTAP tests for reporting a housemate. Run with `supabase test db`.
begin;
select plan(20);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-00000000000b');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Messy room', -2, 'penalty');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- Ana (a housemate) files reports.
select lives_ok($$select set_config('t.r1', public.submit_report('00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002')::text, true)$$,
  'a housemate reports another for a catalog penalty');
select lives_ok($$select set_config('t.r2', public.submit_report('00000000-0000-0000-0000-000000000001', null, '  Left the door open ', true)::text, true)$$,
  'a housemate can report themselves, with a typed demerit and anonymously');
select throws_ok($$select public.submit_report('00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002')$$, '55000',
  'already waiting for approval', 'the same report cannot wait twice');
select throws_ok($$select public.submit_report('00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001')$$, 'P0002',
  'deed not found', 'a good deed is not a demerit');
select throws_ok($$select public.submit_report('00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 'also this')$$, '22023',
  'pick a penalty or type one', 'a report has a penalty or a typed demerit, not both');
select throws_ok($$select public.submit_report('00000000-0000-0000-0000-00000000000a', null, 'Rude')$$, '22023',
  'target must be a housemate in this household', 'an admin cannot be reported');
select throws_ok($$insert into public.report (household_id, reporter_id, subject_id, title) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'sneaky')$$, '42501',
  'permission denied for table report', 'clients cannot write reports directly');

-- Who can read them: the reporter and the admin, never the reported housemate or another household.
select is((select count(*) from public.report), 2::bigint, 'the reporter reads their own reports');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*) from public.report), 0::bigint, 'the reported housemate cannot read the report');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$select public.submit_report('00000000-0000-0000-0000-000000000002', null, 'Rude')$$, '42501', 'housemates only',
  'an admin cannot file a report');
select is((select count(*) from public.report), 2::bigint, 'the admin reads every report');

select lives_ok($$select public.decide_report(current_setting('t.r1')::uuid, true)$$, 'admin accepts a catalog report');
select is((select points::text || ' ' || report_note from public.score_entry where member_id = '00000000-0000-0000-0000-000000000002'),
  '-2 Reported by Ana', 'it scores the penalty and tells Ben who reported');
select throws_ok($$select public.decide_report(current_setting('t.r2')::uuid, true, 3)$$, '22023', 'points must be negative',
  'a typed demerit needs negative points');
select lives_ok($$select public.decide_report(current_setting('t.r2')::uuid, true, -3)$$, 'admin accepts a typed demerit with points');
select is((select title || ' ' || points::text || ' ' || report_note from public.score_entry where member_id = '00000000-0000-0000-0000-000000000001'),
  'Left the door open -3 Reported anonymously', 'an anonymous report hides the reporter');

select is((select count(*) from public.score_entry where report_id = current_setting('t.r1')::uuid), 1::bigint,
  'the scored entry points back at its report');

-- Only an admin of the same household decides.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select throws_ok($$select public.decide_report(current_setting('t.r1')::uuid, false)$$, 'P0002', 'report not found',
  'an admin of another household cannot decide');

-- Removing a housemate closes the reports still waiting on them.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select lives_ok($$select set_config('t.r3', public.submit_report('00000000-0000-0000-0000-000000000001', null, 'Loud')::text, true)$$, 'Ben reports Ana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.remove_housemate('00000000-0000-0000-0000-000000000001');
select is((select status from public.report where id = current_setting('t.r3')::uuid), 'rejected', 'a waiting report about a removed housemate is closed');

select * from finish();
rollback;
