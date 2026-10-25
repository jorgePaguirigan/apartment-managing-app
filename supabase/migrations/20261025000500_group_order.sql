-- Admins drag catalog groups into their own order. Existing groups keep the order they were created in.
alter table public.deed_group add column position int not null default 0;
update public.deed_group g set position = o.n
  from (select id, row_number() over (partition by household_id order by created_at) - 1 as n from public.deed_group) o
  where o.id = g.id;
