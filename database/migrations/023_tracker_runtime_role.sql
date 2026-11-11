begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'tracker_runtime') then
    create role tracker_runtime
      nologin
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit;
  end if;

  execute format('grant tracker_runtime to %I', current_user);
end;
$$;

revoke all on schema tracker from tracker_runtime;
revoke all on all tables in schema tracker from tracker_runtime;
revoke all on all sequences in schema tracker from tracker_runtime;
revoke all on all functions in schema tracker from tracker_runtime;
revoke all on all procedures in schema tracker from tracker_runtime;

grant usage on schema tracker_read to tracker_runtime;
grant select on all tables in schema tracker_read to tracker_runtime;
grant execute on all functions in schema tracker_read to tracker_runtime;

alter default privileges in schema tracker_read
  grant select on tables to tracker_runtime;
alter default privileges in schema tracker_read
  grant execute on functions to tracker_runtime;

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
    where n.nspname = 'tracker'
      and c.enabled
      and c.data_operation in ('read', 'write')
  loop
    routine_ref := routine.oid::regprocedure::text;
    if routine.prokind = 'p' then
      execute format('grant execute on procedure %s to tracker_runtime', routine_ref);
    else
      if routine.data_operation = 'write' then
        execute format('alter function %s security definer', routine_ref);
        execute format('alter function %s set search_path = pg_catalog, tracker, tracker_read', routine_ref);
      end if;
      execute format('grant execute on function %s to tracker_runtime', routine_ref);
    end if;
  end loop;
end;
$$;

comment on role tracker_runtime is
  'Non-login application role. Reads tracker_read views/functions and executes cataloged tracker routines; no direct tracker table access.';

commit;
