-- pgTAP tests for scheduling. Run with `supabase test db`.
-- Week starts (Monday, Manila): 28 Sep, 5 Oct, 12 Oct, 19 Oct, 26 Oct 2026.
begin;
select plan(32);

create function pg_temp.act(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', u::text, true),
         set_config('role', 'authenticated', true)
$$;
create function pg_temp.i(c uuid, wk date) returns uuid language sql as $$
  select id from public.chore_instance where chore_id = c and week_start = wk
$$;
create function pg_temp.q(c uuid, wk date) returns text language sql as $$
  select string_agg(m.display_name, ',' order by q.pos)
  from public.chore_queue(c, wk) q join public.member m on m.user_id = q.member_id
$$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ben'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Cy'),
  ('00000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Dee'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Swept the floor', 2, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Cooked dinner', 4, 'good');
insert into public.chore (id, household_id, name, weekday, weight, deed_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Sweep', 2, 1, 'dddddddd-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Trash', 4, 2, null),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Mop', 3, 1, 'dddddddd-0000-0000-0000-000000000001');

-- History for Sweep: Ana did it the week of 28 Sep, Ben on 5 Oct, Cy was assigned on 12 Oct but never did it, Dee never had it.
insert into public.claim (id, household_id, member_id, deed_id, status, decided_by, decided_at) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'accepted', '00000000-0000-0000-0000-00000000000a', now()),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'accepted', '00000000-0000-0000-0000-00000000000a', now());
insert into public.score_entry (household_id, member_id, deed_id, points, source, claim_id, approved_by, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 2, 'claim', 'eeeeeeee-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2026-09-29 10:00+08'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 2, 'claim', 'eeeeeeee-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '2026-10-06 10:00+08');
insert into public.chore_instance (household_id, chore_id, week_start, assignee, source, claim_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000001', '2026-09-28', '00000000-0000-0000-0000-000000000001', 'queue', 'eeeeeeee-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000001', '2026-10-05', '00000000-0000-0000-0000-000000000002', 'queue', 'eeeeeeee-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000001', '2026-10-12', '00000000-0000-0000-0000-000000000003', 'queue', null);
-- Cooked dinner in October (Manila): Ben 3 times (one just after midnight on the 1st, one just before it on 30 Sep), Ana 2, Cy 1, the admin 5.
insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', m, 'dddddddd-0000-0000-0000-000000000002', 4, 'admin', '00000000-0000-0000-0000-00000000000a', t::timestamptz
from (values
  ('00000000-0000-0000-0000-000000000002'::uuid, '2026-10-01 00:30+08'), ('00000000-0000-0000-0000-000000000002'::uuid, '2026-10-10 10:00+08'),
  ('00000000-0000-0000-0000-000000000002'::uuid, '2026-10-11 10:00+08'), ('00000000-0000-0000-0000-000000000002'::uuid, '2026-09-30 23:59+08'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '2026-10-02 10:00+08'), ('00000000-0000-0000-0000-000000000001'::uuid, '2026-10-03 10:00+08'),
  ('00000000-0000-0000-0000-000000000003'::uuid, '2026-10-04 10:00+08'),
  ('00000000-0000-0000-0000-00000000000a'::uuid, '2026-10-02 11:00+08'), ('00000000-0000-0000-0000-00000000000a'::uuid, '2026-10-03 11:00+08'),
  ('00000000-0000-0000-0000-00000000000a'::uuid, '2026-10-04 11:00+08')
) v (m, t);

select pg_temp.act('00000000-0000-0000-0000-000000000001');

-- Queue: Dee never had it, Cy was assigned but missed it (still ahead of the two who did it), then the oldest completion.
select is(pg_temp.q('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), 'Dee,Cy,Ana,Ben',
  'queue: never done first (longest unassigned first), then oldest completion');

-- Week of 19 Oct: 3 chores of total weight 4 for 4 housemates, so a fair share is 1.
select public.generate_week('2026-10-19', '2026-10-14 12:00+08');
select is((select count(*) from public.chore_instance where week_start = '2026-10-19'), 3::bigint, 'generate_week creates one instance per active chore');
select throws_ok($$select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000003', '2026-10-19'), '2026-10-26 00:00+08')$$,
  '55000', 'dibs are closed', 'no dibs once the week is over');
select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000003', '2026-10-19'), '2026-10-14 23:59+08');
select is((select assignee::text || source from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000003' and week_start = '2026-10-19'),
  '00000000-0000-0000-0000-000000000001dibs', 'dibs are open any time before the week ends, not only Thursday to Saturday');
select throws_ok($$select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), '2026-10-17 23:59+08')$$,
  '55000', 'over your fair share', 'a second dib past the fair share is refused');
select pg_temp.act('00000000-0000-0000-0000-000000000002');
select throws_ok($$select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000002', '2026-10-19'), '2026-10-17 23:59+08')$$,
  '55000', 'over your fair share', 'one heavy chore is more than a fair share');
select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), '2026-10-17 23:59+08');
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000002', '2026-10-19'), '2026-10-17 12:00+08')$$,
  '42501', 'housemates only', 'an admin cannot dib');

select pg_temp.act('00000000-0000-0000-0000-000000000003');
select public.generate_week('2026-10-19', '2026-10-17 23:59+08');
select is((select assignee from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000002' and week_start = '2026-10-19'),
  null, 'Saturday 23:59: unclaimed chores are not allocated yet');
select throws_ok($$select public.dib_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000002', '2026-10-19'), '2026-10-18 00:00+08')$$,
  '55000', 'over your fair share', 'Sunday dibs still respect the fair share');
select public.generate_week('2026-10-19', '2026-10-18 00:00+08');
select is((select assignee::text || source from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000002' and week_start = '2026-10-19'),
  '00000000-0000-0000-0000-000000000003queue', 'Sunday 00:00: Trash goes to the lowest load; Cy and Dee tie, name decides');
select is((select assignee from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000001' and week_start = '2026-10-19'),
  '00000000-0000-0000-0000-000000000002'::uuid, 'a dib beats the queue (Ben is last in the Sweep queue)');
select public.generate_week('2026-10-19', '2026-10-18 12:00+08');
select is((select count(*) from public.chore_instance where week_start = '2026-10-19' and assignee is not null), 3::bigint,
  'running generate_week again changes nothing');
select throws_ok($$select public.generate_week('2026-11-02', '2026-10-18 12:00+08')$$, '22023', 'week must be this Monday or next', 'only this week and next can be generated');

-- Most frequent doer this month (Manila time): Ben has 3 (one came in at 00:30 on the 1st; 23:59 on 30 Sep is September).
select is((select array_agg(display_name || ':' || times) from public.top_doers('this_month', '2026-10-25 12:00+08')),
  array['Ben:3'], 'top doer: most entries, at least 2, housemates only');

-- Results come back ordered by time: Wed + 1 week, Sun 23:59, Mon 00:00.
select is((select array_agg(public.schedule_week(w, t) order by t) from (values (0, '2026-10-18 23:59+08'::timestamptz), (0, '2026-10-19 00:00+08'), (1, '2026-10-14 12:00+08')) v (w, t)),
  array['2026-10-19', '2026-10-12', '2026-10-19']::date[], 'weeks start Monday 00:00 in the household time zone');
select is((select array_agg(public.week_phase('2026-10-19', t) order by t) from (values
  ('2026-10-14 23:59+08'::timestamptz), ('2026-10-15 00:00+08'), ('2026-10-18 00:00+08'), ('2026-10-19 00:00+08'), ('2026-10-26 00:00+08')) v (t)),
  array['early', 'dibs', 'published', 'current', 'past'], 'week phases switch at Thursday, Sunday and Monday 00:00');

select throws_ok($$insert into public.chore_instance (household_id, chore_id, week_start) values ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000001', '2026-12-07')$$,
  '42501', null, 'a housemate cannot write instances directly');
select throws_ok($$select public.upsert_chore(null, 'Dust', null, 1, 1)$$, '42501', 'admin only', 'a housemate cannot add chores');

select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select public.assign_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000002', '2026-10-19'), '00000000-0000-0000-0000-00000000000a', '2026-10-18 12:00+08')$$,
  '22023', 'target must be a housemate in this household', 'an admin is never given a chore');
select is(pg_temp.q('cccccccc-0000-0000-0000-000000000001', '2026-10-26'), 'Dee,Cy,Ana,Ben', 'queue before the drag');
select public.assign_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), '00000000-0000-0000-0000-000000000001', '2026-10-18 12:00+08');
select is((select assignee::text || source from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000001' and week_start = '2026-10-19'),
  '00000000-0000-0000-0000-000000000001admin', 'the admin moves Sweep from Ben to Ana');
select is(pg_temp.q('cccccccc-0000-0000-0000-000000000001', '2026-10-26'), 'Dee,Cy,Ana,Ben', 'a drag does not count as doing the chore: the queue is unchanged');

-- Next week, on Sunday: Trash (heaviest) -> Ana (first in its queue); Sweep -> Dee; Mop -> Ben.
select public.generate_week('2026-10-26', '2026-10-25 12:00+08');
select is((select a.display_name from public.chore_instance i join public.member a on a.user_id = i.assignee
           where i.chore_id = 'cccccccc-0000-0000-0000-000000000002' and i.week_start = '2026-10-26'), 'Ana', 'Trash goes to the front of its queue');
select is((select a.display_name from public.chore_instance i join public.member a on a.user_id = i.assignee
           where i.chore_id = 'cccccccc-0000-0000-0000-000000000001' and i.week_start = '2026-10-26'), 'Dee', 'Sweep goes to the first housemate who did not just sweep');
select is((select a.display_name from public.chore_instance i join public.member a on a.user_id = i.assignee
           where i.chore_id = 'cccccccc-0000-0000-0000-000000000003' and i.week_start = '2026-10-26'), 'Ben', 'Mop skips Ana (already loaded) and Cy and Ben tie, name decides');

-- Completion goes through the claim flow.
select pg_temp.act('00000000-0000-0000-0000-000000000003');
select throws_ok($$select public.complete_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000002', '2026-10-19'), null, '2026-10-20 12:00+08')$$,
  '22023', 'chore has no deed to claim', 'a chore without a deed cannot be claimed');
select pg_temp.act('00000000-0000-0000-0000-000000000002');
select throws_ok($$select public.complete_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), null, '2026-10-20 12:00+08')$$,
  'P0002', 'chore not found', 'only the assignee can complete a chore');
select pg_temp.act('00000000-0000-0000-0000-000000000001');
select throws_ok($$select public.complete_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), null, '2026-10-18 12:00+08')$$,
  '55000', 'week has not started', 'a chore cannot be completed before its week');
select public.complete_chore(pg_temp.i('cccccccc-0000-0000-0000-000000000001', '2026-10-19'), null, '2026-10-20 12:00+08');
select is((select c.status from public.chore_instance i join public.claim c on c.id = i.claim_id
           where i.chore_id = 'cccccccc-0000-0000-0000-000000000001' and i.week_start = '2026-10-19'), 'pending', 'completing files a pending claim');

select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select public.decide_claim((select claim_id from public.chore_instance where chore_id = 'cccccccc-0000-0000-0000-000000000001' and week_start = '2026-10-19'), true);
select is(pg_temp.q('cccccccc-0000-0000-0000-000000000001', '2026-10-26'), 'Dee,Cy,Ben,Ana', 'an accepted completion sends Ana to the back of the queue');
select public.delete_entry((select s.id from public.score_entry s join public.chore_instance i on i.claim_id = s.claim_id
                            where i.chore_id = 'cccccccc-0000-0000-0000-000000000001' and i.week_start = '2026-10-19'));
select is(pg_temp.q('cccccccc-0000-0000-0000-000000000001', '2026-10-26'), 'Dee,Cy,Ana,Ben', 'deleting the entry puts the queue back (it is derived, not stored)');

-- Another household sees nothing of this one.
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
select is((select count(*) from public.chore) + (select count(*) from public.chore_instance), 0::bigint, 'chores are private to the household');

select * from finish();
rollback;
