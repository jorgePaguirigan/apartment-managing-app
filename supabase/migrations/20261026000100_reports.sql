-- A housemate can report a housemate (themselves included) for a penalty. The admin decides: accepting scores the penalty
-- at once, exactly like an admin-entered penalty. The reporter chooses whether the reported housemate is told who reported.
create table public.report (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  reporter_id uuid not null references public.member (user_id) on delete cascade,
  subject_id uuid not null references public.member (user_id) on delete cascade,
  deed_id uuid references public.deed (id),
  title text,
  anonymous boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  decided_by uuid references public.member (user_id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_deed_or_title check ((deed_id is null) <> (title is null)),
  constraint report_title_length check (title is null or char_length(title) between 1 and 80)
);
create index on public.report (household_id, status);
create unique index report_pending_deed_unique on public.report (reporter_id, subject_id, deed_id)
  where status = 'pending' and deed_id is not null;
create unique index report_pending_title_unique on public.report (reporter_id, subject_id, lower(title))
  where status = 'pending' and title is not null;

-- Admins read every report; a housemate reads only their own. The reported housemate never reads the report itself.
alter table public.report enable row level security;
create policy report_read on public.report for select
  using (household_id = public.current_household() and (public.is_admin() or reporter_id = auth.uid()));
revoke all on public.report from anon;
grant select on public.report to authenticated;

-- What the reported housemate sees beside the penalty in their history: who reported, or that it was anonymous.
alter table public.score_entry add column report_note text;

create function public.submit_report(p_subject uuid, p_deed uuid default null, p_title text default null, p_anonymous boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_title text := nullif(btrim(coalesce(p_title, '')), ''); v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and scored) then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.member
                 where user_id = p_subject and scored and household_id = public.current_household()) then
    raise exception 'target must be a housemate in this household' using errcode = '22023';
  end if;
  if (p_deed is null) = (v_title is null) then raise exception 'pick a penalty or type one' using errcode = '22023'; end if;
  if v_title is not null and char_length(v_title) > 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  if p_deed is not null and not exists (
       select 1 from public.deed where id = p_deed and kind = 'penalty' and active and deleted_at is null
         and household_id = public.current_household()) then
    raise exception 'deed not found' using errcode = 'P0002';
  end if;
  insert into public.report (household_id, reporter_id, subject_id, deed_id, title, anonymous)
    values (public.current_household(), auth.uid(), p_subject, p_deed, v_title, coalesce(p_anonymous, false)) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already waiting for approval' using errcode = '55000';
end $$;

-- Accepting a catalog report scores that penalty's points; a custom one needs negative points from the admin.
create function public.decide_report(p_report uuid, p_accept boolean, p_points int default null) returns void
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
    insert into public.score_entry (household_id, member_id, deed_id, title, points, source, approved_by, report_note)
      values (v_report.household_id, v_report.subject_id, v_report.deed_id, v_report.title, v_points, 'admin', auth.uid(), v_note);
  end if;
end $$;

-- Removing a housemate also closes the reports about them or from them that were still waiting.
create or replace function public.remove_housemate(p_member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tz text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.member set role = 'removed'
    where user_id = p_member and role = 'housemate' and household_id = public.current_household();
  if not found then raise exception 'housemate not found' using errcode = 'P0002'; end if;

  update public.claim set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where member_id = p_member and status = 'pending';
  update public.report set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where status = 'pending' and (subject_id = p_member or reporter_id = p_member);

  select h.timezone into v_tz from public.household h where h.id = public.current_household();
  update public.chore_instance i set assignee = null, source = null, claim_id = null
    where i.assignee = p_member
      and i.week_start >= date_trunc('week', now() at time zone v_tz)::date
      and not exists (select 1 from public.claim c where c.id = i.claim_id and c.status = 'accepted');
end $$;

alter publication supabase_realtime add table public.report;

revoke execute on function public.submit_report(uuid, uuid, text, boolean), public.decide_report(uuid, boolean, int)
  from public, anon;
grant execute on function public.submit_report(uuid, uuid, text, boolean), public.decide_report(uuid, boolean, int) to authenticated;
