-- pgTAP tests for the preset chores. Run with `supabase test db`.
begin;
select plan(7);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select public.create_household('Casa', 'Admin');

create function pg_temp.days(n text) returns int[] language sql as $$
  select array_agg(weekday order by weekday) from public.chore where name = n
$$;

select is((select count(*) from public.chore), 14::bigint, 'a new household gets 14 preset chores');
select is(pg_temp.days('Cook dinner'), array[1, 2, 3, 4, 5, 6, 7], 'Cook dinner every day');
select is(pg_temp.days('Sweep the floor'), array[1, 3, 5], 'Sweep the floor Monday, Wednesday, Friday');
select is(pg_temp.days('Laundry'), array[2, 4, 6], 'Laundry Tuesday, Thursday, Saturday');
select is(pg_temp.days('Palengke'), array[6], 'Palengke every Saturday');
select is((select count(*) from public.chore where deed_id is null), 0::bigint, 'every preset chore can be claimed through a deed');
select throws_ok($$select public.seed_chores(public.current_household())$$, '42501', null, 'clients cannot seed chores themselves');

select * from finish();
rollback;
