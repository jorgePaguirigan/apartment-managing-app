-- Weeks start on Sunday (household time zone) in every score period: leaderboard, history, medals, emails.
-- Postgres date_trunc('week') starts on Monday, so one helper shifts it a day and the week calculations go through it.
create function public.period_start(p_unit text, p_ts timestamp) returns timestamp
language sql immutable set search_path = '' as $$
  select case when p_unit = 'week' then date_trunc('week', p_ts + interval '1 day') - interval '1 day'
              else date_trunc(p_unit, p_ts) end
$$;

-- Rewritten in place so each function keeps its current body. leaderboard() and medals() wrap the first two,
-- and period_snapshot() and medal_changes() call them, so they follow.
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in ('leaderboard_for', 'medals_for', 'member_history')
  loop
    def := replace(replace(pg_get_functiondef(f.oid),
      'date_trunc(v_unit, ', 'public.period_start(v_unit, '),
      'date_trunc(''week'', ', 'public.period_start(''week'', ');
    execute def;
  end loop;
end $$;
