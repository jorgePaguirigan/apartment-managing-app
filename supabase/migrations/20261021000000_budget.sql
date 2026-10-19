-- Budget (v3): envelope categories with a monthly amount, and spending entries.
-- Clients read; writes go through upsert_category (admin) and log_spend (housemate).
create table public.budget_category (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  monthly_amount numeric(12, 2) not null check (monthly_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index on public.budget_category (household_id, lower(name)) where active;

create table public.spend_entry (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household (id) on delete cascade,
  category_id uuid not null references public.budget_category (id),
  member_id uuid not null references public.member (user_id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text check (note is null or char_length(note) <= 120),
  spent_on date not null, -- the date in the household time zone
  created_at timestamptz not null default now()
);
create index on public.spend_entry (household_id, spent_on);

alter table public.budget_category enable row level security;
alter table public.spend_entry enable row level security;
create policy budget_category_read on public.budget_category for select using (household_id = public.current_household());
create policy spend_entry_read on public.spend_entry for select using (household_id = public.current_household());
revoke all on public.budget_category, public.spend_entry from anon;
revoke insert, update, delete on public.budget_category, public.spend_entry from authenticated;
grant select on public.budget_category, public.spend_entry to authenticated;

-- Admin creates a category (p_id null) or edits one. Archiving (p_active false) hides it but keeps its spending.
create function public.upsert_category(p_id uuid, p_name text, p_amount numeric, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 or p_amount is null or p_amount < 0 then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.budget_category (household_id, name, monthly_amount)
      values (public.current_household(), trim(p_name), p_amount) returning id into v_id;
  else
    update public.budget_category set name = trim(p_name), monthly_amount = p_amount, active = p_active
      where id = p_id and household_id = public.current_household() returning id into v_id;
    if v_id is null then raise exception 'category not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

-- A housemate logs spending against a category. The date is today in the household time zone.
create function public.log_spend(p_category uuid, p_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_hh uuid := public.current_household(); v_tz text; v_id uuid;
begin
  if not exists (select 1 from public.member where user_id = auth.uid() and role = 'housemate') then
    raise exception 'housemates only' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount' using errcode = '22023'; end if;
  if not exists (select 1 from public.budget_category where id = p_category and household_id = v_hh and active) then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  select timezone into v_tz from public.household where id = v_hh;
  insert into public.spend_entry (household_id, category_id, member_id, amount, note, spent_on)
    values (v_hh, p_category, auth.uid(), p_amount, nullif(trim(p_note), ''), (now() at time zone v_tz)::date)
    returning id into v_id;
  return v_id;
end $$;

-- One row per category for a month: allowance, spent and left (left can be negative).
-- p_month is any date in the month; null means the current month in the household time zone.
-- shortcut: the allowance uses each category's current amount, so editing an amount also changes past months; store amounts per month if that matters.
create function public.budget_summary(p_month date default null)
returns table (category_id uuid, name text, monthly_amount numeric, spent numeric, "left" numeric, month_start date)
language sql stable security definer set search_path = '' as $$
  with h as (
    select id, date_trunc('month', coalesce(p_month, (now() at time zone timezone)::date))::date as m
    from public.household where id = public.current_household()
  )
  select c.id, c.name, c.monthly_amount,
         coalesce(sum(s.amount), 0)::numeric, c.monthly_amount - coalesce(sum(s.amount), 0), h.m
  from h
  join public.budget_category c on c.household_id = h.id and (c.active or exists (
    select 1 from public.spend_entry x where x.category_id = c.id and x.spent_on >= h.m and x.spent_on < h.m + interval '1 month'))
  left join public.spend_entry s on s.category_id = c.id and s.spent_on >= h.m and s.spent_on < h.m + interval '1 month'
  group by c.id, c.name, c.monthly_amount, h.m
  order by c.name
$$;

-- First day of the month p_month falls in (null: today), in the household time zone. Works before any category exists.
create function public.budget_month(p_month date default null) returns date
language sql stable security definer set search_path = '' as $$
  select date_trunc('month', coalesce(p_month, (now() at time zone timezone)::date))::date
  from public.household where id = public.current_household()
$$;

revoke execute on function public.upsert_category(uuid, text, numeric, boolean), public.log_spend(uuid, numeric, text),
  public.budget_summary(date), public.budget_month(date) from public, anon;
grant execute on function public.upsert_category(uuid, text, numeric, boolean), public.log_spend(uuid, numeric, text),
  public.budget_summary(date), public.budget_month(date) to authenticated;
