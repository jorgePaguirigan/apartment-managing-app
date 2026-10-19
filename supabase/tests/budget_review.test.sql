-- Budget review fixes: past months, archived categories, name clashes, totals in SQL.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-000000000001');
insert into public.household (id, name, timezone) values ('aaaaaaaa-0000-0000-0000-000000000000', 'A', 'Asia/Manila');
insert into public.member (user_id, household_id, role, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'Admin A'),
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'housemate', 'Ana');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select set_config('t.old', public.upsert_category(null, 'Old', 500)::text, true);
select set_config('t.late', public.upsert_category(null, 'Late', 700)::text, true);

-- Dates are fixed so the test does not depend on today.
reset role;
update public.budget_category set created_at = '2026-08-01 09:00+08' where id = current_setting('t.old')::uuid;
update public.budget_category set created_at = '2026-10-05 09:00+08' where id = current_setting('t.late')::uuid;
insert into public.spend_entry (household_id, category_id, member_id, amount, spent_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.old')::uuid, '00000000-0000-0000-0000-000000000001', 50, '2026-10-02');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

-- A category does not exist in months before it was created.
select is((select count(*) from public.budget_summary('2026-09-10') where name = 'Late')::int, 0, 'a category created in October is not in September');
select is((select count(*) from public.budget_summary('2026-10-10') where name = 'Late')::int, 1, 'but it is in October');

-- The summary says whether a category is active, so the page can stop offering archived ones.
select public.upsert_category(current_setting('t.old')::uuid, 'Old', 500, false);
select is((select active from public.budget_summary('2026-10-10') where name = 'Old'), false, 'an archived category with spending shows as inactive');

-- Editing without saying "active" keeps the category archived; only an explicit true brings it back.
select public.upsert_category(current_setting('t.old')::uuid, 'Old', 600);
select is((select active from public.budget_category where id = current_setting('t.old')::uuid), false, 'saving an edit does not un-archive');
select public.upsert_category(current_setting('t.old')::uuid, 'Old', 600, true);
select is((select active from public.budget_category where id = current_setting('t.old')::uuid), true, 'an explicit true restores it');

-- A name already in use (any case) gets a clear error.
select throws_ok($$select public.upsert_category(null, 'late', 10)$$, '23505', 'category name taken', 'a duplicate name is refused clearly');

-- Month bounds and totals come from SQL. Tiny: 0.10 + 0.20 spent of 0.30 is exactly zero left.
select set_config('t.tiny', public.upsert_category(null, 'Tiny', 0.30)::text, true);
reset role;
update public.budget_category set created_at = '2026-10-05 09:00+08' where id = current_setting('t.tiny')::uuid;
insert into public.spend_entry (household_id, category_id, member_id, amount, spent_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.tiny')::uuid, '00000000-0000-0000-0000-000000000001', 0.10, '2026-10-06'),
  ('aaaaaaaa-0000-0000-0000-000000000000', current_setting('t.tiny')::uuid, '00000000-0000-0000-0000-000000000001', 0.20, '2026-10-06');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is((select month_start from public.budget_overview('2026-10-10')), '2026-10-01'::date, 'overview starts the month on the 1st');
select is((select month_end from public.budget_overview('2026-10-10')), '2026-11-01'::date, 'and ends on the next 1st');
select is((select month_start from public.budget_overview('2026-10-10', -1)), '2026-09-01'::date, 'an offset of -1 is the month before');
select is((select allowance from public.budget_overview('2026-10-10')), 1300.30::numeric, 'allowance is the sum of the categories');
select is((select "left" from public.budget_overview('2026-10-10')), 1250.00::numeric, 'left is exact in cents, never a float');

select * from finish();
rollback;
