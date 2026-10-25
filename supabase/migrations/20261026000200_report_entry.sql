-- An accepted report remembers the entry it scored, so the reporter's History can show the points that were applied.
alter table public.score_entry add column report_id uuid unique references public.report (id);

create or replace function public.decide_report(p_report uuid, p_accept boolean, p_points int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_report public.report; v_points int; v_note text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into v_report from public.report
    where id = p_report and household_id = public.current_household() for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
  if v_report.status <> 'pending' then raise exception 'report already decided' using errcode = '55000'; end if;
  if p_accept and v_report.deed_id is null and coalesce(p_points, 0) >= 0 then
    raise exception 'points must be negative' using errcode = '22023';
  end if;
  if p_points is not null and v_report.deed_id is not null then
    raise exception 'catalog reports use catalog points' using errcode = '22023';
  end if;
  update public.report
    set status = case when p_accept then 'accepted' else 'rejected' end, decided_by = auth.uid(), decided_at = now()
    where id = p_report;
  if p_accept then
    if not exists (select 1 from public.member where user_id = v_report.subject_id and scored) then
      raise exception 'target must be a housemate in this household' using errcode = '22023';
    end if;
    if v_report.deed_id is null then v_points := p_points;
    else select points into v_points from public.deed where id = v_report.deed_id;
    end if;
    select case when v_report.anonymous then 'Reported anonymously' else 'Reported by ' || display_name end into v_note
      from public.member where user_id = v_report.reporter_id;
    insert into public.score_entry (household_id, member_id, deed_id, title, points, source, approved_by, report_note, report_id)
      values (v_report.household_id, v_report.subject_id, v_report.deed_id, v_report.title, v_points, 'admin', auth.uid(), v_note, p_report);
  end if;
end $$;
