-- Budget (v3): roles, month boundaries in the household time zone, and per-category isolation.
begin;
select plan(12);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000b0'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.household (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'Admin B'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'housemate', 'Bea');

-- Admin sets up two categories.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select set_config('t.wifi', public.upsert_category(null, 'Wifi', 1500)::text, true);
select set_config('t.food', public.upsert_category(null, 'Groceries', 4000)::text, true);
select throws_ok($$select public.log_spend(current_setting('t.wifi')::uuid, 10)$$, '42501', 'housemates only',
  'an admin is not a housemate and cannot log spending');

-- A housemate cannot manage categories or write tables directly.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok($$select public.upsert_category(null, 'Rent', 9000)$$, '42501', 'admin only', 'a housemate cannot create a category');
select throws_ok($$insert into public.spend_entry (household_id, category_id, member_id, amount, spent_on)
  values ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.wifi')::uuid, auth.uid(), 5, current_date)$$,
  '42501', null, 'a housemate cannot insert spending directly');
select throws_ok($$select public.log_spend(current_setting('t.wifi')::uuid, -5)$$, '22023', 'invalid amount', 'spending must be positive');

-- Spending in one category never changes another; overspending goes negative.
select public.log_spend(current_setting('t.wifi')::uuid, 1800, 'router');
select is((select "left" from public.budget_summary() where name = 'Wifi'), -300::numeric, 'overspending shows a negative left');
select is((select "left" from public.budget_summary() where name = 'Groceries'), 4000::numeric, 'other categories are untouched');
select is((select sum("left") from public.budget_summary()), 3700::numeric, 'total left equals the sum of category lefts');

-- Month boundary follows the household time zone: 23:30 on the last day in Manila is still that month.
reset role;
update public.household set timezone = 'Asia/Manila' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
insert into public.spend_entry (household_id, category_id, member_id, amount, spent_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.food')::uuid, '00000000-0000-0000-0000-000000000001', 100, '2026-08-31'),
  ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.food')::uuid, '00000000-0000-0000-0000-000000000001', 250, '2026-09-01');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select spent from public.budget_summary('2026-08-15') where name = 'Groceries'), 100::numeric, 'August only counts August');
select is((select spent from public.budget_summary('2026-09-15') where name = 'Groceries'), 250::numeric, 'September only counts September');

select is(public.budget_month('2026-09-30'), '2026-09-01'::date, 'budget_month gives the first of the month');

-- Another household sees nothing.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*) from public.budget_summary())::int, 0, 'another household cannot see these categories');
select throws_ok($$select public.log_spend(current_setting('t.wifi')::uuid, 5)$$, 'P0002', 'category not found',
  'nor log spending against them');

select * from finish();
rollback;
