begin;

create or replace function tracker.apply_workspace_rollup_delta(
  p_project_delta bigint default 0,
  p_active_oman_project_delta bigint default 0,
  p_parcel_delta bigint default 0,
  p_run_delta bigint default 0,
  p_completed_run_delta bigint default 0,
  p_contact_delta bigint default 0
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.workspace_rollups where rollup_key = 'global') then
    perform tracker.refresh_workspace_rollup();
  end if;

  update tracker.workspace_rollups
  set project_count = project_count + p_project_delta,
      active_oman_project_count = active_oman_project_count + p_active_oman_project_delta,
      parcel_count = parcel_count + p_parcel_delta,
      discovery_run_count = discovery_run_count + p_run_delta,
      completed_discovery_run_count = completed_discovery_run_count + p_completed_run_delta,
      contact_count = contact_count + p_contact_delta,
      refreshed_at = now()
  where rollup_key = 'global';
end;
$$;

create or replace function tracker.workspace_project_insert_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_project_delta => (select count(*) from new_table),
    p_active_oman_project_delta => (select count(*) from new_table where country_iso2 = 'OM' and status = 'active')
  );
  return null;
end;
$$;

create or replace function tracker.workspace_project_update_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_project_delta => (select count(*) from new_table) - (select count(*) from old_table),
    p_active_oman_project_delta =>
      (select count(*) from new_table where country_iso2 = 'OM' and status = 'active')
      - (select count(*) from old_table where country_iso2 = 'OM' and status = 'active')
  );
  return null;
end;
$$;

create or replace function tracker.workspace_project_delete_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_project_delta => -(select count(*) from old_table),
    p_active_oman_project_delta => -(select count(*) from old_table where country_iso2 = 'OM' and status = 'active')
  );
  return null;
end;
$$;

create or replace function tracker.workspace_parcel_insert_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_parcel_delta => (select count(*) from new_table)
  );
  return null;
end;
$$;

create or replace function tracker.workspace_parcel_update_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_parcel_delta => (select count(*) from new_table) - (select count(*) from old_table)
  );
  return null;
end;
$$;

create or replace function tracker.workspace_parcel_delete_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_parcel_delta => -(select count(*) from old_table)
  );
  return null;
end;
$$;

create or replace function tracker.workspace_run_insert_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_run_delta => (select count(*) from new_table),
    p_completed_run_delta => (select count(*) from new_table where status = 'completed')
  );
  return null;
end;
$$;

create or replace function tracker.workspace_run_update_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_run_delta => (select count(*) from new_table) - (select count(*) from old_table),
    p_completed_run_delta =>
      (select count(*) from new_table where status = 'completed')
      - (select count(*) from old_table where status = 'completed')
  );
  return null;
end;
$$;

create or replace function tracker.workspace_run_delete_delta_trigger()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.apply_workspace_rollup_delta(
    p_run_delta => -(select count(*) from old_table),
    p_completed_run_delta => -(select count(*) from old_table where status = 'completed')
  );
  return null;
end;
$$;

drop trigger if exists research_projects_workspace_rollup on tracker.research_projects;
drop trigger if exists parcels_workspace_rollup on tracker.parcels;
drop trigger if exists discovery_runs_workspace_rollup on tracker.discovery_runs;

drop trigger if exists research_projects_workspace_rollup_insert on tracker.research_projects;
drop trigger if exists research_projects_workspace_rollup_update on tracker.research_projects;
drop trigger if exists research_projects_workspace_rollup_delete on tracker.research_projects;
drop trigger if exists parcels_workspace_rollup_insert on tracker.parcels;
drop trigger if exists parcels_workspace_rollup_update on tracker.parcels;
drop trigger if exists parcels_workspace_rollup_delete on tracker.parcels;
drop trigger if exists discovery_runs_workspace_rollup_insert on tracker.discovery_runs;
drop trigger if exists discovery_runs_workspace_rollup_update on tracker.discovery_runs;
drop trigger if exists discovery_runs_workspace_rollup_delete on tracker.discovery_runs;

create trigger research_projects_workspace_rollup_insert
after insert on tracker.research_projects
referencing new table as new_table
for each statement execute function tracker.workspace_project_insert_delta_trigger();
create trigger research_projects_workspace_rollup_update
after update on tracker.research_projects
referencing old table as old_table new table as new_table
for each statement execute function tracker.workspace_project_update_delta_trigger();
create trigger research_projects_workspace_rollup_delete
after delete on tracker.research_projects
referencing old table as old_table
for each statement execute function tracker.workspace_project_delete_delta_trigger();

create trigger parcels_workspace_rollup_insert
after insert on tracker.parcels
referencing new table as new_table
for each statement execute function tracker.workspace_parcel_insert_delta_trigger();
create trigger parcels_workspace_rollup_update
after update on tracker.parcels
referencing old table as old_table new table as new_table
for each statement execute function tracker.workspace_parcel_update_delta_trigger();
create trigger parcels_workspace_rollup_delete
after delete on tracker.parcels
referencing old table as old_table
for each statement execute function tracker.workspace_parcel_delete_delta_trigger();

create trigger discovery_runs_workspace_rollup_insert
after insert on tracker.discovery_runs
referencing new table as new_table
for each statement execute function tracker.workspace_run_insert_delta_trigger();
create trigger discovery_runs_workspace_rollup_update
after update on tracker.discovery_runs
referencing old table as old_table new table as new_table
for each statement execute function tracker.workspace_run_update_delta_trigger();
create trigger discovery_runs_workspace_rollup_delete
after delete on tracker.discovery_runs
referencing old table as old_table
for each statement execute function tracker.workspace_run_delete_delta_trigger();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'apply_workspace_rollup_delta', 'p_project_delta bigint, p_active_oman_project_delta bigint, p_parcel_delta bigint, p_run_delta bigint, p_completed_run_delta bigint, p_contact_delta bigint', 'function', 'Apply statement-level deltas to the global workspace rollup, with a full rebuild fallback when the rollup row is absent.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_project_insert_delta_trigger', '', 'function', 'Apply project and active-Oman project deltas after an insert statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_project_update_delta_trigger', '', 'function', 'Apply project and active-Oman project deltas after an update statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_project_delete_delta_trigger', '', 'function', 'Apply project and active-Oman project deltas after a delete statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_parcel_insert_delta_trigger', '', 'function', 'Apply parcel-count deltas after an insert statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_parcel_update_delta_trigger', '', 'function', 'Apply parcel-count deltas after an update statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_parcel_delete_delta_trigger', '', 'function', 'Apply parcel-count deltas after a delete statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_run_insert_delta_trigger', '', 'function', 'Apply run and completed-run deltas after an insert statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_run_update_delta_trigger', '', 'function', 'Apply run and completed-run deltas after an update statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql'),
  ('tracker', 'workspace_run_delete_delta_trigger', '', 'function', 'Apply run and completed-run deltas after a delete statement.', 'maintenance', '027_workspace_rollup_delta_triggers.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
