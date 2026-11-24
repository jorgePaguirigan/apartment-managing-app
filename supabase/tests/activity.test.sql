-- pgTAP tests for activity(): one scored member's deeds and points per day, in the household time zone, for the heatmap.
begin;
select plan(24);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'), ('00000000-0000-0000-0000-000000000004');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'removed', 'Cy'),
  ('00000000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Dee');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

-- Today is Wed 21 Oct 2026, Manila. Weeks start Sunday 18 Oct.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at, deleted_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', p, 'admin',
       '00000000-0000-0000-0000-00000000000a', t::timestamptz, d::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 1, '2025-12-31 23:00:00+08', null),  -- last year, the household's first entry
  ('00000000-0000-0000-0000-000000000001'::uuid, 5, '2026-10-17 23:59:59+08', null),  -- Saturday: last week
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-10-18 00:00:00+08', null),  -- Sunday: this week
  ('00000000-0000-0000-0000-000000000001'::uuid, 3, '2026-10-18 10:00:00+08', null),  -- same Sunday
  ('00000000-0000-0000-0000-000000000001'::uuid, -1, '2026-10-19 10:00:00+08', null), -- penalty: never counts
  ('00000000-0000-0000-0000-000000000001'::uuid, 4, '2026-10-20 10:00:00+08', '2026-10-20 11:00:00+08'), -- deleted: never counts
  ('00000000-0000-0000-0000-000000000002'::uuid, 9, '2026-10-20 10:00:00+08', null)   -- Ben's, never under Ana
) v (m, p, t, d);

-- Claims count on the day they were submitted, not the day they were accepted.
-- Ana's: submitted Saturday 17 Oct 23:30 Manila, accepted Sunday 09:00. Ben's, with Ana as a contributor: submitted Tuesday 20 Oct,
-- accepted Wednesday. Ben's other one: submitted 30 Dec 2025, accepted 5 Jan 2026, before the household's first award.
insert into public.claim (id, household_id, member_id, deed_id, status, decided_by, decided_at, created_at)
select c, 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', 'accepted',
       '00000000-0000-0000-0000-00000000000a', a::timestamptz, t::timestamptz
from (values
  ('cccccccc-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '2026-10-17 23:30+08', '2026-10-18 09:00+08'),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '2026-10-20 09:00+08', '2026-10-21 11:00+08'),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '2025-12-30 10:00+08', '2026-01-05 10:00+08')
) v (c, m, t, a);
insert into public.claim_contributor (claim_id, member_id) values
  ('cccccccc-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
insert into public.score_entry (household_id, member_id, deed_id, points, source, claim_id, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', 2, 'claim', c,
       '00000000-0000-0000-0000-00000000000a', a::timestamptz
from (values
  ('cccccccc-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '2026-10-18 09:00+08'),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '2026-10-21 11:00+08'),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '2026-10-21 11:00+08'),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '2026-01-05 10:00+08')
) v (c, m, a);

-- Ben reads Ana's activity, as the leaderboard card does. He cannot read Ana's claim row himself.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local role authenticated;

create temp view ana_week as
  select * from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08') order by day;

select is((select array_agg(day order by day) from ana_week),
  array(select generate_series('2026-10-18'::date, '2026-10-24', '1 day')::date), 'week: Sunday 18 to Saturday 24 Oct');
select is((select array_agg(weekday order by day) from ana_week), array[0, 1, 2, 3, 4, 5, 6], 'weekday 0 is Sunday');
select is((select array_agg(deeds order by day) from ana_week), array[2, 0, 1, 0, 0, 0, 0],
  'deeds: two on Sunday, the contributor entry on Tuesday; the penalty, the deleted entry and Ben''s entries never count');
select is((select array_agg(points order by day) from ana_week), array[5, 0, 2, 0, 0, 0, 0], 'points: the sum of that day''s deeds');
select is((select (deeds, points)::text from ana_week where day = '2026-10-20'), '(1,2)',
  'a contributor''s entry lands on the day the claim was submitted, not the day it was accepted');
select is((select array_agg(day order by day) from ana_week where future),
  array['2026-10-22', '2026-10-23', '2026-10-24']::date[], 'days after today are future');

select is((select points from public.activity('00000000-0000-0000-0000-000000000001', 'week', '2026-10-17', '2026-10-21 12:00+08')
           where day = '2026-10-17'), 7, 'the anchor picks the week: Saturday 23:59 Manila is still last week');
select is((select (deeds, points)::text from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08', -1)
           where day = '2026-10-17'), '(2,7)', 'a claim submitted Saturday 23:30 and accepted Sunday stays in last week');

select is((select (count(*), min(day), max(day), min(weekday) filter (where day = '2026-10-01'))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'month', null, '2026-10-21 12:00+08')),
  '(31,2026-10-01,2026-10-31,4)', 'month: 1 to 31 Oct, starting on a Thursday');

select is((select (count(*), sum(points), max(day) filter (where deeds > 0))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'year', '2025-06-01', '2026-10-21 12:00+08')),
  '(365,1,2025-12-31)', 'year: all of 2025; 31 Dec 23:00 Manila is still 2025');

select is((select (count(*), min(day), max(day), sum(points), sum(deeds))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'last_12_months', null, '2026-10-21 12:00+08')),
  '(365,2025-10-22,2026-10-21,15,6)', 'last 12 months: ends today');

select is((select distinct (today, first_day)::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08')),
  '(2026-10-21,2025-12-30)', 'today and the household''s first day, for the arrows: a claim''s submit day counts');

-- p_step moves the range back or forward by whole weeks, months or years, worked out here and not in the client.
select is((select (min(day), max(day), sum(points))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08', -1)),
  '(2026-10-11,2026-10-17,7)', 'step -1 week: Sunday 11 to Saturday 17 Oct');
select is((select (count(*), min(day), sum(points))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'month', null, '2026-10-21 12:00+08', -10)),
  '(31,2025-12-01,1)', 'step -10 months crosses into last year: December 2025');
select is((select (count(*), min(day))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'year', null, '2026-10-21 12:00+08', -1)),
  '(365,2025-01-01)', 'step -1 year: 2025');
select is((select (count(*), min(day), max(day))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'last_12_months', '2025-10-21', '2026-10-21 12:00+08', -1)),
  '(366,2023-10-22,2024-10-21)', 'step -1 of 12 months lands on the same date a year back, leap day included');
select is((select (count(*), min(day), max(day))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'last_12_months', '2025-10-21', '2026-10-21 12:00+08', 2)),
  '(365,2025-10-22,2026-10-21)', 'stepping 12 months forward never ends after today');
select is((select count(*)::int from public.activity(p_member => '00000000-0000-0000-0000-000000000001', p_view => 'week', p_anchor => null)),
  7, 'callers that pass no step still get the current range');

select throws_ok($$select * from public.activity('00000000-0000-0000-0000-000000000001', 'forever')$$,
  '22023', 'unknown view', 'an unknown view is refused');
select throws_ok($$select * from public.activity('00000000-0000-0000-0000-00000000000a', 'week')$$,
  '22023', 'not a housemate', 'an admin who is not scored has no activity');
select throws_ok($$select * from public.activity('00000000-0000-0000-0000-000000000004', 'week')$$,
  '22023', 'not a housemate', 'a housemate of another household is refused');

-- A removed housemate and an outsider read nothing.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select throws_ok($$select * from public.activity('00000000-0000-0000-0000-000000000001', 'week')$$,
  '42501', 'not a member', 'a removed housemate is refused');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select throws_ok($$select * from public.activity('00000000-0000-0000-0000-000000000001', 'week')$$,
  '22023', 'not a housemate', 'another household''s housemate cannot read Ana');

reset role;
select ok(not has_function_privilege('anon', 'public.activity(uuid, text, date, timestamptz, int)', 'execute'),
  'anon cannot call activity()');

select * from finish();
rollback;
