-- Review fixes for the budget: months before a category existed, archived categories, name clashes, totals in SQL.

-- Per category for a month. A category shows in a month if it existed by the end of that month (household time zone) and is
-- active, or if it has spending in that month. `active` lets the page stop offering archived ones.
drop function public.budget_summary(date);
create function public.budget_summary(p_month date default null)
returns table (category_id uuid, name text, monthly_amount numeric, spent numeric, "left" numeric, month_start date, active boolean)
language sql stable security definer set search_path = '' as $$
  with h as (
    select id, timezone, date_trunc('month', coalesce(p_month, (now() at time zone timezone)::date))::date as m
    from public.household where id = public.current_household()
  )
  select c.id, c.name, c.monthly_amount,
         coalesce(sum(s.amount), 0)::numeric, c.monthly_amount - coalesce(sum(s.amount), 0), h.m, c.active
  from h
  join public.budget_category c on c.household_id = h.id
  left join public.spend_entry s on s.category_id = c.id and s.spent_on >= h.m and s.spent_on < h.m + interval '1 month'
  group by c.id, c.name, c.monthly_amount, c.active, c.created_at, h.m, h.timezone
  having (c.active and (c.created_at at time zone h.timezone)::date < h.m + interval '1 month') or count(s.id) > 0
  order by c.name
$$;
revoke execute on function public.budget_summary(date) from public, anon;
grant execute on function public.budget_summary(date) to authenticated;

-- p_active null means "leave as is", so saving an edit never un-archives. A taken name (any case) is refused clearly.
drop function public.upsert_category(uuid, text, numeric, boolean);
create function public.upsert_category(p_id uuid, p_name text, p_amount numeric, p_active boolean default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_hh uuid := public.current_household(); v_active boolean;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 or p_amount is null or p_amount < 0 then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if p_id is null then v_active := true;
  else
    select active into v_active from public.budget_category where id = p_id and household_id = v_hh;
    if not found then raise exception 'category not found' using errcode = 'P0002'; end if;
    v_active := coalesce(p_active, v_active);
  end if;
  if v_active and exists (select 1 from public.budget_category
      where household_id = v_hh and active and lower(name) = lower(trim(p_name)) and id is distinct from p_id) then
    raise exception 'category name taken' using errcode = '23505';
  end if;
  if p_id is null then
    insert into public.budget_category (household_id, name, monthly_amount) values (v_hh, trim(p_name), p_amount) returning id into v_id;
  else
    update public.budget_category set name = trim(p_name), monthly_amount = p_amount, active = v_active
      where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;
revoke execute on function public.upsert_category(uuid, text, numeric, boolean) from public, anon;
grant execute on function public.upsert_category(uuid, text, numeric, boolean) to authenticated;

-- The month (p_month's month, moved by p_offset months) with its bounds and totals, all in the household time zone.
-- Replaces budget_month: the page no longer does any month maths of its own.
drop function public.budget_month(date);
create function public.budget_overview(p_month date default null, p_offset int default 0)
returns table (month_start date, month_end date, allowance numeric, spent numeric, "left" numeric)
language sql stable security definer set search_path = '' as $$
  with m as (
    select (date_trunc('month', coalesce(p_month, (now() at time zone timezone)::date)) + p_offset * interval '1 month')::date as s
    from public.household where id = public.current_household()
  )
  select m.s, (m.s + interval '1 month')::date,
         coalesce(sum(b.monthly_amount), 0)::numeric, coalesce(sum(b.spent), 0)::numeric, coalesce(sum(b."left"), 0)::numeric
  from m left join lateral public.budget_summary(m.s) b on true
  group by m.s
$$;
revoke execute on function public.budget_overview(date, int) from public, anon;
grant execute on function public.budget_overview(date, int) to authenticated;

-- A waiting claim reads the deed's points when it is accepted, so the deed must stay claimable until then.
create function public.deed_kind_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> old.kind and exists (select 1 from public.claim where deed_id = old.id and status = 'pending') then
    raise exception 'deed has pending claims' using errcode = '55000';
  end if;
  return new;
end $$;
create trigger deed_kind_guard before update on public.deed
  for each row execute function public.deed_kind_guard();

-- Budget screens update live, like claims.
alter publication supabase_realtime add table public.budget_category, public.spend_entry;
