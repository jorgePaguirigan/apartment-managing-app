-- The chore schedule follows the same Sunday weeks as scores (see sunday_weeks_scores): chore_instance.week_start is a
-- Sunday, and chore.weekday stays 1 = Monday to 7 = Sunday, so a chore falls on week_start + weekday % 7.
-- Unclaimed chores are handed out at the start of the week itself (Sunday 00:00), not the day before it.

-- Existing weeks (Mondays) move back one day. A chore on Sunday keeps its weekday, so it now falls at the start of the
-- shifted week, not the end.
update public.chore_instance set week_start = week_start - 1;

-- Rewritten in place so each function keeps its current body; every replacement must change something.
create function pg_temp.patch(p_name text, p_from text, p_to text) returns void language plpgsql as $$
declare v_oid oid; v_def text;
begin
  select p.oid into strict v_oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = p_name;
  v_def := pg_get_functiondef(v_oid);
  if position(p_from in v_def) = 0 then raise exception 'patch % not found in %', p_from, p_name; end if;
  execute replace(v_def, p_from, p_to);
end $$;

select pg_temp.patch('generate_week', 'date_trunc(''week'', v_local)', 'public.period_start(''week'', v_local)');
select pg_temp.patch('generate_week', 'extract(isodow from p_week_start) <> 1', 'extract(isodow from p_week_start) <> 7');
select pg_temp.patch('generate_week', 'this Monday or next', 'this Sunday or next');
select pg_temp.patch('generate_week', '(p_week_start - 1)::timestamp', 'p_week_start::timestamp');
select pg_temp.patch('undib_chore', '(v_i.week_start - 1)::timestamp', 'v_i.week_start::timestamp');
select pg_temp.patch('schedule_week', 'date_trunc(''week'', p_now at time zone h.timezone)', 'public.period_start(''week'', p_now at time zone h.timezone)');
select pg_temp.patch('available_chores', 'i.week_start + c.weekday - 1', 'i.week_start + c.weekday % 7');
select pg_temp.patch('remove_housemate', 'date_trunc(''week'', now() at time zone v_tz)', 'public.period_start(''week'', now() at time zone v_tz)');

-- There is no gap between the dibs window and the week any more, so no 'published' phase.
create or replace function public.week_phase(p_week_start date, p_now timestamptz default now()) returns text
language sql stable set search_path = '' as $$
  select case
    when l < (p_week_start - 4)::timestamp then 'early'
    when l < p_week_start::timestamp then 'dibs'
    when l < (p_week_start + 7)::timestamp then 'current'
    else 'past' end
  from (select p_now at time zone h.timezone as l from public.household h where h.id = public.current_household()) x
$$;
