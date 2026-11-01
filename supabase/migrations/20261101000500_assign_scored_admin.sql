-- A chore card can be dragged to any scored member, including an admin who also lives there (member.scored).
-- assign_chore still checked role = 'housemate', so dropping a card on such an admin failed.
create or replace function pg_temp.patch(p_name text, p_from text, p_to text) returns void language plpgsql as $$
declare v_oid oid; v_def text;
begin
  select p.oid into strict v_oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = p_name;
  v_def := pg_get_functiondef(v_oid);
  if position(p_from in v_def) = 0 then raise exception 'patch % not found in %', p_from, p_name; end if;
  execute replace(v_def, p_from, p_to);
end $$;
select pg_temp.patch('assign_chore', 'user_id = p_member and role = ''housemate'' and household_id', 'user_id = p_member and scored and household_id');
