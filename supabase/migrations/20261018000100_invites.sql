-- Invite links: an admin shares a code, anyone signed in can join with it until it is revoked.

create table public.invite (
  code text primary key default replace(gen_random_uuid()::text, '-', ''),
  household_id uuid not null references public.household (id) on delete cascade,
  role text not null default 'housemate' check (role in ('admin', 'housemate')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on public.invite (household_id);

alter table public.invite enable row level security;
create policy invite_admin_read on public.invite for select
  using (household_id = public.current_household() and public.is_admin());
revoke all on public.invite from anon;
revoke insert, update, delete on public.invite from authenticated;

create function public.create_invite(p_role text default 'housemate') returns text
language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.invite (household_id, role) values (public.current_household(), p_role)
    returning code into v_code;
  return v_code;
end $$;

create function public.revoke_invite(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.invite set revoked_at = now()
    where code = p_code and household_id = public.current_household() and revoked_at is null;
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
end $$;

create function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_invite public.invite;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.member where user_id = auth.uid()) then
    raise exception 'already in a household' using errcode = '55000';
  end if;
  select * into v_invite from public.invite where code = p_code and revoked_at is null;
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  insert into public.member (user_id, household_id, role, display_name)
    values (auth.uid(), v_invite.household_id, v_invite.role, p_display_name);
  return v_invite.household_id;
end $$;

revoke execute on function public.create_invite(text), public.revoke_invite(text),
  public.join_household(text, text) from public, anon;
grant execute on function public.create_invite(text), public.revoke_invite(text),
  public.join_household(text, text) to authenticated;
