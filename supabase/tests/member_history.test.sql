-- pgTAP tests for member_history: a housemate's entries limited to one period in the household time zone.
begin;
select plan(7);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

-- Today is Wed 21 Oct 2026, Manila. Points tell the entries apart. Ben's entry must never show under Ana.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at, deleted_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', p, 'admin',
       '00000000-0000-0000-0000-00000000000a', t::timestamptz, d::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 3, '2026-09-30 23:59:59+08', null),  -- last month
  ('00000000-0000-0000-0000-000000000001'::uuid, 7, '2026-10-01 00:00:00+08', null),  -- this month
  ('00000000-0000-0000-0000-000000000001'::uuid, 5, '2026-10-18 23:59:59+08', null),  -- Sunday: last week
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-10-19 00:00:00+08', null),  -- Monday: this week
  ('00000000-0000-0000-0000-000000000001'::uuid, 4, '2026-10-20 10:00:00+08', '2026-10-20 11:00:00+08'), -- deleted, still listed
  ('00000000-0000-0000-0000-000000000002'::uuid, 9, '2026-10-20 10:00:00+08', null)
) v (m, p, t, d);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select is((select array_agg(points) from public.member_history('00000000-0000-0000-0000-000000000001', 'this_week', '2026-10-21 12:00+08')),
  array[4, 2], 'this week: only this week, newest first, a deleted entry still listed');
select is((select array_agg(points) from public.member_history('00000000-0000-0000-0000-000000000001', 'prev_week', '2026-10-21 12:00+08')),
  array[5], 'last week: Sunday 23:59 Manila is still last week');
select is((select array_agg(points) from public.member_history('00000000-0000-0000-0000-000000000001', 'this_month', '2026-10-21 12:00+08')),
  array[4, 2, 5, 7], 'this month: the 1st at 00:00 Manila is in');
select is((select array_agg(points) from public.member_history('00000000-0000-0000-0000-000000000001', 'prev_month', '2026-10-21 12:00+08')),
  array[3], 'last month: 30 Sep 23:59 Manila is September');
select is((select count(*) from public.member_history('00000000-0000-0000-0000-000000000002', 'prev_week', '2026-10-21 12:00+08')),
  0::bigint, 'a period with no entries is empty');
select throws_ok($$select * from public.member_history('00000000-0000-0000-0000-000000000001', 'forever')$$, '22023', 'unknown period', 'unknown period is refused');

reset role;
select is((select count(*) from public.score_entry), 6::bigint, 'reading history wrote nothing');

select * from finish();
rollback;
