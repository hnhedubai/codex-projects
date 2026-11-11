begin;

create or replace procedure tracker.reconcile_rollups()
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  call tracker.refresh_discovery_contact_rollups();
  perform tracker.refresh_workspace_rollup();
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values (
  'tracker', 'reconcile_rollups', '', 'procedure',
  'Rebuild researcher contact rollups and the global workspace rollup after imports, restores, or drift checks.',
  'maintenance', '031_reconcile_rollups_procedure.sql'
)
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
