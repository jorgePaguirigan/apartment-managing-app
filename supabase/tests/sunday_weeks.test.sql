-- pgTAP tests for weeks that start on Sunday (household time zone, Manila). Run with `supabase test db`.
begin;
select plan(6);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good');

-- Weeks: Sun 25 Oct to Sat 31 Oct, then Sun 1 Nov to Sat 7 Nov 2026. "Now" is Wednesday 4 Nov.
-- Ana is the only one to do Dishes, on a Saturday and the Sunday after it (17 and 18 Oct).
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 1, 'claim',
       '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values ('2026-10-17 23:59:59+08'), ('2026-10-18 00:00:00+08')) v (t);

insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', p, s,
       '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values
  (5, 'claim', '2026-10-31 23:59:59+08'), -- Saturday: last week
  (2, 'claim', '2026-11-01 00:00:00+08'), -- Sunday: this week
  (3, 'claim', '2026-11-04 10:00:00+08')  -- this week
) v (p, s, t);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;

select is((select points from public.leaderboard('this_week', '2026-11-04 12:00+08') where display_name = 'Ana'), 5::bigint,
  'Sunday 00:00 Manila starts the week: 2 + 3 this week');
select is((select points from public.leaderboard('prev_week', '2026-11-04 12:00+08') where display_name = 'Ana'), 5::bigint,
  'Saturday 23:59 Manila is still last week');
select is((select array_agg(points order by points) from public.member_history('00000000-0000-0000-0000-000000000001', 'this_week', '2026-11-04 12:00+08')),
  array[2, 3], 'history uses the same Sunday bounds');
select is((select array_agg(points) from public.member_history('00000000-0000-0000-0000-000000000001', 'prev_week', '2026-11-04 12:00+08')),
  array[5], 'history: Saturday 23:59 is last week');
select is((select points from public.leaderboard('prev_week', '2026-11-01 00:00+08') where display_name = 'Ana'), 5::bigint,
  'at Sunday 00:00 the week that just ended is already the previous week');
select is((select count(*) from public.medals('2026-11-04 12:00+08') where label = 'Dishes champion'), 1::bigint,
  'a Saturday and the next Sunday are two weeks in a row: Dishes champion');

select * from finish();
rollback;
