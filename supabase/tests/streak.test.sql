-- pgTAP tests for streak(): the caller's day streak for the Home pill, in the household time zone.
-- Seam: streak(p_now) as each member, read back as (days, today_done, today_waiting).
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'), ('00000000-0000-0000-0000-000000000004'), ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Cy'),
  ('00000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Dee'),
  ('00000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Fay'),
  ('00000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Gus');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 2, 'good');

-- Today is Wed 25 Nov 2026, noon in Manila.
-- Awards: Ana every day from 20 to 24 Nov after a gap on the 19th. Cy on 22 Nov, 24 Nov 23:59:59 and 25 Nov 00:00 Manila;
-- on 23 Nov Cy has only a penalty and a deleted award.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at, deleted_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', p, 'admin',
       '00000000-0000-0000-0000-00000000000a', t::timestamptz, d::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-18 10:00+08', null),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-20 10:00+08', null),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-21 10:00+08', null),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-22 10:00+08', null),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-23 10:00+08', null),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2, '2026-11-24 10:00+08', null),
  ('00000000-0000-0000-0000-000000000003'::uuid, 2, '2026-11-22 10:00+08', null),
  ('00000000-0000-0000-0000-000000000003'::uuid, -1, '2026-11-23 10:00+08', null),
  ('00000000-0000-0000-0000-000000000003'::uuid, 2, '2026-11-23 11:00+08', '2026-11-23 12:00+08'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 2, '2026-11-24 23:59:59+08', null),
  ('00000000-0000-0000-0000-000000000003'::uuid, 2, '2026-11-25 00:00:00+08', null),
  ('00000000-0000-0000-0000-000000000004'::uuid, 2, '2026-11-22 10:00+08', null),
  ('00000000-0000-0000-0000-000000000004'::uuid, 2, '2026-11-24 10:00+08', null)
) v (m, p, t, d);

-- Dee claimed on 23 Nov with Ben as a contributor; the admin accepted it only today at 09:00.
insert into public.claim (id, household_id, member_id, deed_id, status, decided_by, decided_at, created_at) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004',
   'dddddddd-0000-0000-0000-000000000001', 'accepted', '00000000-0000-0000-0000-00000000000a', '2026-11-25 09:00+08', '2026-11-23 10:00+08');
insert into public.claim_contributor (claim_id, member_id) values
  ('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
insert into public.score_entry (household_id, member_id, deed_id, points, source, claim_id, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000001', 2, 'claim',
       'cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2026-11-25 09:00+08'
from unnest(array['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002']::uuid[]) m;

-- Today: Fay claims with Gus as a contributor, still pending. Ana's claim from today was rejected.
insert into public.claim (id, household_id, member_id, deed_id, status, created_at) values
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005',
   'dddddddd-0000-0000-0000-000000000001', 'pending', '2026-11-25 08:00+08'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'rejected', '2026-11-25 08:00+08');
insert into public.claim_contributor (claim_id, member_id) values
  ('cccccccc-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006');

set local role authenticated;
create function pg_temp.as_member(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', p::text, true)
$$;
create function pg_temp.streak_of(p uuid) returns text language sql as $$
  select pg_temp.as_member(p);
  select (s.days, s.today_done, s.today_waiting)::text from public.streak('2026-11-25 12:00+08') s
$$;

select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000001'), '(5,f,f)',
  'five days in a row up to yesterday; today with no deed yet does not break it');
select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000003'), '(2,t,f)',
  '23:59:59 and 00:00 Manila are two days; a penalty and a deleted entry do not fill a day');
select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000004'), '(3,f,f)',
  'a claim counts on the day it was submitted, not the day it was accepted');
select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000002'), '(0,f,f)',
  'a contributor''s entry counts on the claim''s submit day too: 23 Nov, then a gap');
select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000005'), '(0,f,t)', 'a claim from today still pending shows as waiting');
select is(pg_temp.streak_of('00000000-0000-0000-0000-000000000006'), '(0,f,t)', 'so does one they are a contributor on');

-- Ana's run ends on 24 Nov: it lasts all of the 25th and is gone once the 25th ends with no deed.
select pg_temp.as_member('00000000-0000-0000-0000-000000000001');
select is((select days from public.streak('2026-11-25 23:59+08')), 5, 'today stays open until midnight in Manila');
select is((select days from public.streak('2026-11-26 00:30+08')), 0, 'a whole day with no deed ends the streak');
select is((select count(*)::int from public.streak('2026-11-25 12:00+08')), 1, 'one row');

select pg_temp.as_member('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select * from public.streak()$$, '22023', null, 'an admin who is not scored has no streak');

reset role;
select ok(not has_function_privilege('anon', 'public.streak(timestamptz)', 'execute'), 'anon cannot call streak()');

select * from finish();
rollback;
