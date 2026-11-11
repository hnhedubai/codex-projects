begin;

do $$
declare
  routine record;
  routine_ref text;
begin
  for routine in
    select p.oid, p.prokind
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('tracker', 'tracker_read')
  loop
    routine_ref := routine.oid::regprocedure::text;
    if routine.prokind = 'p' then
      execute format('revoke execute on procedure %s from public, tracker_runtime', routine_ref);
    else
      execute format('revoke execute on function %s from public, tracker_runtime', routine_ref);
    end if;
  end loop;
end;
$$;

do $$
declare
  routine record;
  routine_ref text;
begin
  for routine in
    select
      p.oid,
      p.prokind,
      c.data_operation
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join tracker.routine_catalog c
      on c.routine_schema = n.nspname
     and c.routine_name = p.proname
     and c.identity_arguments = pg_get_function_identity_arguments(p.oid)
     and c.routine_kind = case when p.prokind = 'p' then 'procedure' else 'function' end
    where n.nspname in ('tracker', 'tracker_read')
      and c.enabled
      and c.data_operation in ('read', 'write')
  loop
    routine_ref := routine.oid::regprocedure::text;
    if routine.prokind = 'p' then
      execute format('grant execute on procedure %s to tracker_runtime', routine_ref);
    else
      execute format('grant execute on function %s to tracker_runtime', routine_ref);
    end if;
  end loop;
end;
$$;

commit;
