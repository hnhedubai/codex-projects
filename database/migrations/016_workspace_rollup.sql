begin;

create table if not exists tracker.workspace_rollups (
  rollup_key text primary key check (rollup_key = 'global'),
  project_count bigint not null check (project_count >= 0),
  active_oman_project_count bigint not null check (active_oman_project_count >= 0),
  parcel_count bigint not null check (parcel_count >= 0),
  discovery_run_count bigint not null check (discovery_run_count >= 0),
  completed_discovery_run_count bigint not null check (completed_discovery_run_count >= 0),
  contact_count bigint not null check (contact_count >= 0),
  refreshed_at timestamptz not null default now()
);

create or replace view tracker_read.v_workspace_rollups as
select rollup_key, project_count, active_oman_project_count, parcel_count,
       discovery_run_count, completed_discovery_run_count, contact_count,
       refreshed_at
from tracker.workspace_rollups;

create or replace function tracker.refresh_workspace_rollup()
returns void
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  insert into tracker.workspace_rollups (
    rollup_key, project_count, active_oman_project_count, parcel_count,
    discovery_run_count, completed_discovery_run_count, contact_count, refreshed_at
  )
  values (
    'global',
    (select count(*) from tracker.research_projects),
    (select count(*) from tracker.research_projects where country_iso2 = 'OM' and status = 'active'),
    (select count(*) from tracker.parcels),
    (select count(*) from tracker.discovery_runs),
    (select count(*) from tracker.discovery_runs where status = 'completed'),
    (select count(*) from tracker.discovery_contacts),
    now()
  )
  on conflict (rollup_key) do update set
    project_count = excluded.project_count,
    active_oman_project_count = excluded.active_oman_project_count,
    parcel_count = excluded.parcel_count,
    discovery_run_count = excluded.discovery_run_count,
    completed_discovery_run_count = excluded.completed_discovery_run_count,
    contact_count = excluded.contact_count,
    refreshed_at = excluded.refreshed_at;
end;
$$;

create or replace function tracker.workspace_rollup_statement_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  perform tracker.refresh_workspace_rollup();
  return null;
end;
$$;

drop trigger if exists research_projects_workspace_rollup on tracker.research_projects;
create trigger research_projects_workspace_rollup
after insert or update or delete on tracker.research_projects
for each statement execute function tracker.workspace_rollup_statement_trigger();

drop trigger if exists parcels_workspace_rollup on tracker.parcels;
create trigger parcels_workspace_rollup
after insert or update or delete on tracker.parcels
for each statement execute function tracker.workspace_rollup_statement_trigger();

drop trigger if exists discovery_runs_workspace_rollup on tracker.discovery_runs;
create trigger discovery_runs_workspace_rollup
after insert or update or delete on tracker.discovery_runs
for each statement execute function tracker.workspace_rollup_statement_trigger();

drop trigger if exists discovery_contacts_workspace_rollup on tracker.discovery_contacts;
create trigger discovery_contacts_workspace_rollup
after insert or update or delete on tracker.discovery_contacts
for each statement execute function tracker.workspace_rollup_statement_trigger();

call tracker.refresh_discovery_contact_rollups();
select tracker.refresh_workspace_rollup();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'refresh_workspace_rollup', '', 'function', 'Rebuild the global dashboard summary from source tables after controlled DML.', 'maintenance', '016_workspace_rollup.sql'),
  ('tracker', 'workspace_rollup_statement_trigger', '', 'function', 'Keep global dashboard counts synchronized after project, parcel, run, or contact statements.', 'maintenance', '016_workspace_rollup.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
