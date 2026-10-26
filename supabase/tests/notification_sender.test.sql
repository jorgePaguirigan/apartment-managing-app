-- pgTAP tests for the sender's side of claim emails: take_notifications / finish_notification and the cron job that
-- wakes the sender. Run with `supabase test db`.
begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000001', 'ana@example.com');
insert into public.household (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');
insert into public.deed (id, household_id, name, points, kind) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Toilet', 5, 'good'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Dishes', 1, 'good'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Cooking', 4, 'good');
-- Start from an empty outbox, whatever a dev database holds. Three claims queue three admin emails; the Toilet one is the oldest.
delete from public.notification;
insert into public.claim (id, household_id, member_id, deed_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003');
update public.notification set created_at = now() - interval '30 minutes' where claim_id = 'cccccccc-0000-0000-0000-000000000001';
update public.notification set created_at = now() - interval '20 minutes' where claim_id = 'cccccccc-0000-0000-0000-000000000002';
update public.notification set created_at = now() - interval '10 minutes' where claim_id = 'cccccccc-0000-0000-0000-000000000003';

do $$ begin
  perform set_config('t.n1', (select id::text from public.notification where claim_id = 'cccccccc-0000-0000-0000-000000000001'), true);
  perform set_config('t.n2', (select id::text from public.notification where claim_id = 'cccccccc-0000-0000-0000-000000000002'), true);
end $$;

-- Clients cannot call the sender's functions.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select * from public.take_notifications(10)$$, '42501', 'permission denied for function take_notifications',
  'a signed-in user cannot take notifications');
select throws_ok($$select public.finish_notification(gen_random_uuid())$$, '42501', 'permission denied for function finish_notification',
  'nor finish them');
set local role anon;
select throws_ok($$select * from public.take_notifications(10)$$, '42501', 'permission denied for function take_notifications',
  'a visitor cannot take notifications');

-- The sender takes the oldest first, with who to send to, and each take counts as an attempt.
set local role service_role;
select is((select count(*)::int from public.take_notifications(1)), 1, 'the sender takes only as many as it asks for');
reset role;
select is((select attempts from public.notification where claim_id = 'cccccccc-0000-0000-0000-000000000001'), 1, 'the oldest was the one taken, and it counts as an attempt');
update public.notification set attempts = 0, tried_at = null where claim_id = 'cccccccc-0000-0000-0000-000000000001';
set local role service_role;
select is((select kind || '/' || email || '/' || display_name || '/' || household || '/' || attempts || '/' || (payload ->> 'chore')
           from public.take_notifications(1)),
  'admin_claim/admin@example.com/Admin/A/1/Toilet', 'a row comes with the recipient''s email, name, household and payload');
select is((select count(*)::int from public.take_notifications(10)), 2, 'the next take gets the other two, not the one just taken');
select is((select count(*)::int from public.take_notifications(10)), 0, 'and nothing is handed out twice in a row: a taken row waits before a retry');

-- After the wait, a row comes back; a finished one does not; a failed one stays waiting with its error.
reset role;
update public.notification set tried_at = now() - interval '5 minutes';
set local role service_role;
select lives_ok($$select public.finish_notification(current_setting('t.n1')::uuid)$$,
  'the sender marks the first one sent');
select lives_ok($$select public.finish_notification(current_setting('t.n2')::uuid, 'smtp down')$$,
  'and records a failure on the second');
select is((select array_agg(payload ->> 'chore' order by payload ->> 'chore') from public.take_notifications(10)), array['Cooking', 'Dishes'],
  'a sent row is not handed out again; the failed and the untouched ones are');
reset role;
select ok((select sent_at is not null from public.notification where claim_id = 'cccccccc-0000-0000-0000-000000000001'), 'the sent row has its time');
select is((select last_error || '/' || (sent_at is null)::text from public.notification where claim_id = 'cccccccc-0000-0000-0000-000000000002'),
  'smtp down/true', 'the failed row keeps its error and is not sent');

-- Five failed tries and the sender stops trying.
update public.notification set attempts = 5, tried_at = now() - interval '1 day' where claim_id = 'cccccccc-0000-0000-0000-000000000002';
update public.notification set tried_at = now() - interval '1 day' where claim_id = 'cccccccc-0000-0000-0000-000000000003';
set local role service_role;
select is((select array_agg(payload ->> 'chore') from public.take_notifications(10)), array['Cooking'], 'a row that failed five times is not tried again');

-- The cron job wakes the sender only when something is waiting and the project is configured.
reset role;
select is((select schedule from cron.job where jobname = 'send-notifications'), '* * * * *', 'a job wakes the sender every minute');
update public.notification set sent_at = now();
do $$ begin perform vault.create_secret('http://sender.test', 'project_url'); perform vault.create_secret('s3cret', 'cron_secret'); end $$;
do $$ begin execute (select command from cron.job where jobname = 'send-notifications'); end $$;
select is((select count(*)::int from net.http_request_queue), 0, 'nothing waiting: the job does not call the sender');
update public.notification set sent_at = null where claim_id = 'cccccccc-0000-0000-0000-000000000003';
do $$ begin execute (select command from cron.job where jobname = 'send-notifications'); end $$;
select is((select url || '/' || (headers ->> 'x-cron-secret') from net.http_request_queue),
  'http://sender.test/functions/v1/send-notifications/s3cret', 'something waiting: it calls the sender, with the shared secret');
delete from vault.secrets where name = 'project_url';
delete from net.http_request_queue;
do $$ begin execute (select command from cron.job where jobname = 'send-notifications'); end $$;
select is((select count(*)::int from net.http_request_queue), 0, 'not configured: the job calls nothing');

select * from finish();
rollback;
