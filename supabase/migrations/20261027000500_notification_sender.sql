-- Claim emails, part 3: what the sender (the send-notifications Edge Function, running as the service role) calls.
-- It takes waiting rows, mails them, and reports back. A row is tried at most 5 times, waiting one more minute after
-- each failed try, so a Gmail outage does not turn into a flood.
alter table public.notification add column tried_at timestamptz;

create function public.take_notifications(p_limit int default 10)
returns table (id uuid, kind text, claim_id uuid, recipient_id uuid, email text, display_name text, household text, payload jsonb, attempts int)
language sql security definer set search_path = '' as $$
  with picked as (
    select n.id from public.notification n
    where n.sent_at is null and n.attempts < 5
      and (n.tried_at is null or n.tried_at < now() - n.attempts * interval '1 minute')
    order by n.created_at
    limit p_limit
    for update skip locked
  ), taken as (
    update public.notification n set attempts = n.attempts + 1, tried_at = now()
    from picked where n.id = picked.id
    returning n.*
  )
  select t.id, t.kind, t.claim_id, t.recipient_id, u.email::text, m.display_name, h.name, t.payload, t.attempts
  from taken t
  join auth.users u on u.id = t.recipient_id
  join public.member m on m.user_id = t.recipient_id
  join public.household h on h.id = t.household_id
  order by t.created_at
$$;

create function public.finish_notification(p_id uuid, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update public.notification
    set sent_at = case when p_error is null then now() end, last_error = p_error
    where id = p_id
$$;

revoke execute on function public.take_notifications(int) from public, anon, authenticated;
revoke execute on function public.finish_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.take_notifications(int) to service_role;
grant execute on function public.finish_notification(uuid, text) to service_role;

-- Wake the sender every minute, but only when a row is waiting and the project is set up. The address and the shared
-- secret live in Vault (set by hand, never in the repo): `project_url` and `cron_secret`.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.schedule('send-notifications', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb)
  where exists (select 1 from public.notification where sent_at is null and attempts < 5)
    and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
$job$);
