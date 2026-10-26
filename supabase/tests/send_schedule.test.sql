-- pgTAP tests for the send schedule: which waiting housemate emails the sender may take, and when. Run with `supabase test db`.
-- Household A is in Asia/Manila (UTC+8). Rows d1..d3 were decided on Monday 26 Oct 2026 at 15:00, 20:00 and 22:00 local time.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'), ('00000000-0000-0000-0000-000000000001', 'ana@example.com'),
  ('00000000-0000-0000-0000-0000000000b0', 'adminb@example.com');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B');
delete from public.notification;
insert into public.notification (household_id, kind, recipient_id, payload, created_at)
select 'aaaaaaaa-0000-0000-0000-000000000000', k, r, jsonb_build_object('n', n), t::timestamptz
from (values
  ('admin_claim', '00000000-0000-0000-0000-00000000000a'::uuid, 'ad', '2026-10-26 14:00+08'),
  ('housemate_decision', '00000000-0000-0000-0000-000000000001'::uuid, 'd1', '2026-10-26 15:00+08'),
  ('housemate_decision', '00000000-0000-0000-0000-000000000001'::uuid, 'd2', '2026-10-26 20:00+08'),
  ('housemate_decision', '00000000-0000-0000-0000-000000000001'::uuid, 'd3', '2026-10-26 22:00+08')
) v(k, r, n, t);

-- Only an admin sets it; only an admin of that household reads it; nobody writes the table directly.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select public.set_send_schedule(false, array['21:00']::time[])$$, '42501', 'admin only', 'a housemate cannot change the schedule');
select throws_ok($$insert into public.send_schedule (household_id) values ('aaaaaaaa-0000-0000-0000-000000000000')$$, '42501',
  'permission denied for table send_schedule', 'nor write the table directly');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$select public.set_send_schedule(false, array['21:00', '12:00', '12:00']::time[])$$, 'an admin sets set times');
select is((select instant::text || '/' || send_times::text from public.send_schedule), 'false/{12:00:00,21:00:00}',
  'the times are kept sorted and without repeats');
select lives_ok($$select public.set_send_schedule(true, array['21:00']::time[], '19:00', '07:00')$$, 'setting it again replaces it');
select is((select instant::text || '/' || send_times::text || '/' || quiet_from::text || '/' || quiet_until::text from public.send_schedule),
  'true/{21:00:00}/19:00:00/07:00:00', 'with Instant, a send time and quiet hours');
select throws_ok($$select public.set_send_schedule(true, '{}', '19:00', null)$$, '22023', 'invalid schedule', 'quiet hours need both ends');
select throws_ok($$select public.set_send_schedule(true, '{}', '19:00', '19:00')$$, '22023', 'invalid schedule', 'and cannot be empty');
select throws_ok($$select public.set_send_schedule(false, array['01:00','02:00','03:00','04:00','05:00','06:00','07:00']::time[])$$, '22023',
  'invalid schedule', 'at most 6 send times');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b0","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select is((select count(*)::int from public.send_schedule), 0, 'an admin of another household cannot read it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.send_schedule), 0, 'nor a housemate');
reset role;

-- What the sender may take. take_notifications(limit, now): housemate emails follow the schedule, admin emails never wait.
-- No schedule: instant.
delete from public.send_schedule;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad', 'd1', 'd2', 'd3'], 'with no schedule everything decided is due');

-- Set times 21:00 only: a row waits for the next 21:00.
reset role;
update public.notification set attempts = 0, tried_at = null;
delete from public.send_schedule;
insert into public.send_schedule (household_id, instant, send_times) values ('aaaaaaaa-0000-0000-0000-000000000000', false, array['21:00']::time[]);
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad', 'd1', 'd2'], 'set times: rows from before 21:00 go at 21:00, the 22:00 one waits for tomorrow, the admin email does not wait');
reset role;
update public.notification set attempts = 0, tried_at = null;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 20:30+08')),
  array['ad'], 'before 21:00 nothing housemate-facing is due');
reset role;
select is((select max(attempts) from public.notification where payload ->> 'n' like 'd%'), 0, 'and holding a row does not count as an attempt');

-- Two times a day, across midnight.
update public.notification set attempts = 0, tried_at = null;
update public.send_schedule set send_times = array['12:00', '21:00']::time[];
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-27 11:00+08')),
  array['ad', 'd1', 'd2'], 'the 22:00 row waits for 12:00 the next day');
reset role;
update public.notification set attempts = 0, tried_at = null;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-27 12:30+08')),
  array['ad', 'd1', 'd2', 'd3'], 'and goes at 12:00');

-- Instant with quiet hours 19:00 to 07:00 and a send time of 21:00.
reset role;
update public.notification set attempts = 0, tried_at = null;
update public.send_schedule set instant = true, send_times = array['21:00']::time[], quiet_from = '19:00', quiet_until = '07:00';
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad', 'd1', 'd2'], 'quiet hours: the 15:00 row goes at once, the 20:00 one at 21:00, the 22:00 one waits for the morning');
reset role;
update public.notification set attempts = 0, tried_at = null;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 20:30+08')),
  array['ad', 'd1'], 'at 20:30 the 20:00 row is still waiting for 21:00');
reset role;
update public.notification set attempts = 0, tried_at = null;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-27 07:30+08')),
  array['ad', 'd1', 'd2', 'd3'], 'when quiet hours end the morning rows go');

-- Quiet hours that do not cross midnight, with no send time: wait for the end.
reset role;
update public.notification set attempts = 0, tried_at = null;
update public.send_schedule set send_times = '{}', quiet_from = '13:00', quiet_until = '17:00';
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 16:00+08')),
  array['ad'], 'a 15:00 row in quiet hours 13:00 to 17:00 waits');
reset role;
update public.notification set attempts = 0, tried_at = null;
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad', 'd1', 'd2', 'd3'], 'and goes at 17:00');

-- The household time zone decides what 21:00 means.
reset role;
update public.notification set attempts = 0, tried_at = null;
update public.send_schedule set instant = false, send_times = array['21:00']::time[], quiet_from = null, quiet_until = null;
update public.household set timezone = 'UTC' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad'], 'in UTC it is 15:00, so the 21:00 send has not happened');
reset role;
update public.household set timezone = 'Asia/Manila' where id = 'aaaaaaaa-0000-0000-0000-000000000000';

-- A schedule that would never send is treated as instant.
update public.notification set attempts = 0, tried_at = null;
update public.send_schedule set instant = false, send_times = '{}';
set local role service_role;
select is((select array_agg(payload ->> 'n' order by payload ->> 'n') from public.take_notifications(50, '2026-10-26 23:00+08')),
  array['ad', 'd1', 'd2', 'd3'], 'not instant and no times: everything is due, nothing gets stuck');

select * from finish();
rollback;
