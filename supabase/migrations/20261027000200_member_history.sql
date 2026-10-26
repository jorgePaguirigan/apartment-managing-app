-- One housemate's score entries in a week or month of the household time zone, newest first. Same bounds as leaderboard().
-- Deleted entries are listed (the client strikes them through); row-level security still decides who may read them.
create function public.member_history(p_member uuid, p_period text, p_now timestamptz default now())
returns table (id uuid, points int, title text, source text, created_at timestamptz, deleted_at timestamptz, report_note text)
language plpgsql stable set search_path = '' as $$
declare
  v_tz text; v_unit text; v_step interval; v_start timestamp;
begin
  select h.timezone into v_tz from public.household h where h.id = public.current_household();
  if v_tz is null then raise exception 'not a member' using errcode = '42501'; end if;
  if p_period not in ('this_week', 'prev_week', 'this_month', 'prev_month') then
    raise exception 'unknown period' using errcode = '22023';
  end if;
  v_unit := case when p_period like '%week' then 'week' else 'month' end;
  v_step := ('1 ' || v_unit)::interval;
  v_start := date_trunc(v_unit, p_now at time zone v_tz);
  if p_period like 'prev_%' then v_start := v_start - v_step; end if;
  return query
    select e.id, e.points, coalesce(d.name, e.title), e.source, e.created_at, e.deleted_at, e.report_note
    from public.score_entry e left join public.deed d on d.id = e.deed_id
    where e.member_id = p_member
      and e.created_at >= v_start at time zone v_tz and e.created_at < (v_start + v_step) at time zone v_tz
    order by e.created_at desc
    limit 100;
end $$;

revoke execute on function public.member_history(uuid, text, timestamptz) from public, anon;
grant execute on function public.member_history(uuid, text, timestamptz) to authenticated;
