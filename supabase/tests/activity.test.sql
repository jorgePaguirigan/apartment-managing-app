-- pgTAP tests for activity(): one scored member's deeds and points per day, in the household time zone, for the heatmap.
begin;
select plan(15);

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

-- Ben reads Ana's activity, as the leaderboard card does.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local role authenticated;

create temp view ana_week as
  select * from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08') order by day;

select is((select array_agg(day order by day) from ana_week),
  array(select generate_series('2026-10-18'::date, '2026-10-24', '1 day')::date), 'week: Sunday 18 to Saturday 24 Oct');
select is((select array_agg(weekday order by day) from ana_week), array[0, 1, 2, 3, 4, 5, 6], 'weekday 0 is Sunday');
select is((select array_agg(deeds order by day) from ana_week), array[2, 0, 0, 0, 0, 0, 0],
  'deeds: two on Sunday; the penalty, the deleted entry and Ben''s entry never count');
select is((select array_agg(points order by day) from ana_week), array[5, 0, 0, 0, 0, 0, 0], 'points: the sum of that day''s deeds');
select is((select array_agg(day order by day) from ana_week where future),
  array['2026-10-22', '2026-10-23', '2026-10-24']::date[], 'days after today are future');

select is((select points from public.activity('00000000-0000-0000-0000-000000000001', 'week', '2026-10-17', '2026-10-21 12:00+08')
           where day = '2026-10-17'), 5, 'the anchor picks the week: Saturday 23:59 Manila is still last week');

select is((select (count(*), min(day), max(day), min(weekday) filter (where day = '2026-10-01'))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'month', null, '2026-10-21 12:00+08')),
  '(31,2026-10-01,2026-10-31,4)', 'month: 1 to 31 Oct, starting on a Thursday');

select is((select (count(*), sum(points), max(day) filter (where deeds > 0))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'year', '2025-06-01', '2026-10-21 12:00+08')),
  '(365,1,2025-12-31)', 'year: all of 2025; 31 Dec 23:00 Manila is still 2025');

select is((select (count(*), min(day), max(day), sum(points), sum(deeds))::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'last_12_months', null, '2026-10-21 12:00+08')),
  '(365,2025-10-22,2026-10-21,11,4)', 'last 12 months: ends today');

select is((select distinct (today, first_day)::text
           from public.activity('00000000-0000-0000-0000-000000000001', 'week', null, '2026-10-21 12:00+08')),
  '(2026-10-21,2025-12-31)', 'today and the household''s first day, for the arrows');

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

select * from finish();
rollback;
