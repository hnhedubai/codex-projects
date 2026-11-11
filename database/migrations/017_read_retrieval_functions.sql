begin;

create or replace function tracker_read.list_research_projects(
  p_limit integer default 200,
  p_offset integer default 0
)
returns setof tracker_read.v_research_projects
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
    raise exception 'Project page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select * from tracker_read.v_research_projects
    order by created_at desc, id asc
    limit p_limit offset p_offset;
end;
$$;

create or replace function tracker_read.list_parcels(
  p_limit integer default 200,
  p_offset integer default 0,
  p_research_project_id uuid default null
)
returns setof tracker_read.v_parcels
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
    raise exception 'Parcel page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select * from tracker_read.v_parcels
    where p_research_project_id is null
       or research_project_id = p_research_project_id
    order by created_at desc, id asc
    limit p_limit offset p_offset;
end;
$$;

create or replace function tracker_read.list_discovery_runs(
  p_research_project_id uuid,
  p_researcher_id text,
  p_limit integer default 30,
  p_offset integer default 0
)
returns setof tracker_read.v_discovery_runs
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Discovery run page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select * from tracker_read.v_discovery_runs
    where research_project_id = p_research_project_id
      and researcher_id = p_researcher_id
    order by created_at desc, id asc
    limit p_limit offset p_offset;
end;
$$;

create or replace function tracker_read.list_discovery_evidence(
  p_research_project_id uuid,
  p_researcher_id text,
  p_limit integer default 200,
  p_offset integer default 0
)
returns setof tracker_read.v_discovery_evidence
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
    raise exception 'Discovery evidence page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select evidence.*
    from tracker_read.v_discovery_evidence evidence
    join tracker_read.v_discovery_runs run on run.id = evidence.run_id
    where run.research_project_id = p_research_project_id
      and run.researcher_id = p_researcher_id
    order by evidence.created_at desc, evidence.id asc
    limit p_limit offset p_offset;
end;
$$;

create or replace procedure tracker.refresh_routine_catalog()
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  insert into tracker.routine_catalog (
    routine_schema, routine_name, identity_arguments, routine_kind,
    purpose, data_operation
  )
  select
    namespace.nspname,
    routine.proname,
    pg_get_function_identity_arguments(routine.oid),
    case when routine.prokind = 'p' then 'procedure' else 'function' end,
    format('Document the purpose of %s.%s(%s).', namespace.nspname, routine.proname,
      pg_get_function_identity_arguments(routine.oid)),
    case when routine.prokind = 'p' then 'maintenance' else 'read' end
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname in ('tracker', 'tracker_read')
    and routine.prokind in ('f', 'p')
  on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
  do update set updated_at = now();

  delete from tracker.routine_catalog documented
  where not exists (
    select 1
    from pg_proc routine
    join pg_namespace namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = documented.routine_schema
      and routine.proname = documented.routine_name
      and pg_get_function_identity_arguments(routine.oid) = documented.identity_arguments
      and case when routine.prokind = 'p' then 'procedure' else 'function' end = documented.routine_kind
  );
end;
$$;

call tracker.refresh_routine_catalog();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker_read', 'list_research_projects', 'p_limit integer, p_offset integer', 'function', 'Return a bounded, ordered page of research projects from the read model.', 'read', '017_read_retrieval_functions.sql'),
  ('tracker_read', 'list_parcels', 'p_limit integer, p_offset integer, p_research_project_id uuid', 'function', 'Return a bounded, ordered parcel page with optional project filtering from the read model.', 'read', '017_read_retrieval_functions.sql'),
  ('tracker_read', 'list_discovery_runs', 'p_research_project_id uuid, p_researcher_id text, p_limit integer, p_offset integer', 'function', 'Return a researcher-scoped, bounded page of discovery runs.', 'read', '017_read_retrieval_functions.sql'),
  ('tracker_read', 'list_discovery_evidence', 'p_research_project_id uuid, p_researcher_id text, p_limit integer, p_offset integer', 'function', 'Return a researcher-scoped, bounded page of evidence linked to discovery runs.', 'read', '017_read_retrieval_functions.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
