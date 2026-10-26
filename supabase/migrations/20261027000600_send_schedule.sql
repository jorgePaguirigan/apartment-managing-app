-- Claim emails, part 4: the send schedule. An admin chooses when housemate emails go out; admin emails always go at once.
--   instant:     emails go as soon as a claim is decided, except in quiet hours
--   send_times:  times of day (household time zone) at which waiting emails go, as one email per housemate
--   quiet_*:     with instant, a window (it may cross midnight) in which emails wait for the next send time or its end
-- No row means instant. A schedule that would never send (not instant, no times) is treated as instant.
create table public.send_schedule (
  household_id uuid primary key references public.household (id) on delete cascade,
  instant boolean not null default true,
  send_times time[] not null default '{}',
  quiet_from time,
  quiet_until time,
  check ((quiet_from is null) = (quiet_until is null)),
  check (quiet_from is null or quiet_from <> quiet_until),
  check (cardinality(send_times) <= 6)
);
alter table public.send_schedule enable row level security;
create policy send_schedule_read on public.send_schedule for select
  using (household_id = public.current_household() and public.is_admin());
revoke all on public.send_schedule from anon, authenticated;
grant select on public.send_schedule to authenticated;

create function public.set_send_schedule(p_instant boolean, p_times time[], p_quiet_from time default null, p_quiet_until time default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_times time[];
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select coalesce(array_agg(t order by t), '{}') into v_times from (select distinct unnest(p_times) as t) x;
  if (p_quiet_from is null) <> (p_quiet_until is null) or p_quiet_from = p_quiet_until or cardinality(v_times) > 6 then
    raise exception 'invalid schedule' using errcode = '22023';
  end if;
  insert into public.send_schedule (household_id, instant, send_times, quiet_from, quiet_until)
    values (public.current_household(), coalesce(p_instant, true), v_times, p_quiet_from, p_quiet_until)
  on conflict (household_id) do update
    set instant = excluded.instant, send_times = excluded.send_times,
        quiet_from = excluded.quiet_from, quiet_until = excluded.quiet_until;
end $$;
revoke execute on function public.set_send_schedule(boolean, time[], time, time) from public, anon;
grant execute on function public.set_send_schedule(boolean, time[], time, time) to authenticated;

-- May this row be sent yet? Admin emails always may. A housemate email goes at the first release moment at or after the
-- time it was queued: at once when instant outside quiet hours, otherwise the next send time, or when quiet hours end.
create function public.notification_due(p_kind text, p_household uuid, p_created timestamptz, p_now timestamptz)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  s public.send_schedule; v_tz text; l timestamp; n timestamp; r timestamp; cand timestamp; t time; v_quiet boolean;
begin
  if p_created > p_now then return false; end if;
  if p_kind <> 'housemate_decision' then return true; end if;
  select * into s from public.send_schedule where household_id = p_household;
  if not found or (not s.instant and cardinality(s.send_times) = 0) then return true; end if;
  select timezone into v_tz from public.household where id = p_household;
  l := p_created at time zone v_tz;
  n := p_now at time zone v_tz;
  v_quiet := s.instant and s.quiet_from is not null and (
    case when s.quiet_from < s.quiet_until then l::time >= s.quiet_from and l::time < s.quiet_until
         else l::time >= s.quiet_from or l::time < s.quiet_until end);
  if s.instant and not v_quiet then return true; end if;
  foreach t in array s.send_times loop
    cand := l::date + t;
    if cand < l then cand := cand + interval '1 day'; end if;
    r := least(r, cand);
  end loop;
  if v_quiet then
    cand := l::date + s.quiet_until;
    if cand < l then cand := cand + interval '1 day'; end if;
    r := least(r, cand);
  end if;
  return r <= n;
end $$;
revoke execute on function public.notification_due(text, uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- take_notifications now takes the clock too (as the other time-based functions do) and skips rows that are not due yet.
drop function public.take_notifications(int);
create function public.take_notifications(p_limit int default 10, p_now timestamptz default now())
returns table (id uuid, kind text, claim_id uuid, recipient_id uuid, email text, display_name text, household text, payload jsonb, attempts int, created_at timestamptz)
language sql security definer set search_path = '' as $$
  with picked as (
    select n.id from public.notification n
    where n.sent_at is null and n.attempts < 5
      and (n.tried_at is null or n.tried_at < now() - n.attempts * interval '1 minute')
      and public.notification_due(n.kind, n.household_id, n.created_at, p_now)
    order by n.created_at
    limit p_limit
    for update skip locked
  ), taken as (
    update public.notification n set attempts = n.attempts + 1, tried_at = now()
    from picked where n.id = picked.id
    returning n.*
  )
  select t.id, t.kind, t.claim_id, t.recipient_id, u.email::text, m.display_name, h.name, t.payload, t.attempts, t.created_at
  from taken t
  join auth.users u on u.id = t.recipient_id
  join public.member m on m.user_id = t.recipient_id
  join public.household h on h.id = t.household_id
  order by t.created_at
$$;
revoke execute on function public.take_notifications(int, timestamptz) from public, anon, authenticated;
grant execute on function public.take_notifications(int, timestamptz) to service_role;

-- Wake the sender only when a row is actually due, so a held digest does not call it every minute.
select cron.schedule('send-notifications', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb)
  where exists (select 1 from public.notification n where n.sent_at is null and n.attempts < 5
                  and public.notification_due(n.kind, n.household_id, n.created_at, now()))
    and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
$job$);
