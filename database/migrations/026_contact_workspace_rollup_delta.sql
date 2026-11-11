begin;

create or replace function tracker.workspace_contact_rollup_insert_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.workspace_rollups where rollup_key = 'global') then
    perform tracker.refresh_workspace_rollup();
  end if;
  update tracker.workspace_rollups
  set contact_count = contact_count + (select count(*) from new_table),
      refreshed_at = now()
  where rollup_key = 'global';
  return null;
end;
$$;

create or replace function tracker.workspace_contact_rollup_update_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.workspace_rollups where rollup_key = 'global') then
    perform tracker.refresh_workspace_rollup();
  end if;
  update tracker.workspace_rollups
  set contact_count = contact_count
      + (select count(*) from new_table)
      - (select count(*) from old_table),
      refreshed_at = now()
  where rollup_key = 'global';
  return null;
end;
$$;

create or replace function tracker.workspace_contact_rollup_delete_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.workspace_rollups where rollup_key = 'global') then
    perform tracker.refresh_workspace_rollup();
  end if;
  update tracker.workspace_rollups
  set contact_count = contact_count - (select count(*) from old_table),
      refreshed_at = now()
  where rollup_key = 'global';
  return null;
end;
$$;

drop trigger if exists discovery_contacts_workspace_rollup on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_workspace_rollup_insert on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_workspace_rollup_update on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_workspace_rollup_delete on tracker.discovery_contacts;

create trigger discovery_contacts_workspace_rollup_insert
after insert on tracker.discovery_contacts
referencing new table as new_table
for each statement execute function tracker.workspace_contact_rollup_insert_trigger();

create trigger discovery_contacts_workspace_rollup_update
after update on tracker.discovery_contacts
referencing old table as old_table new table as new_table
for each statement execute function tracker.workspace_contact_rollup_update_trigger();

create trigger discovery_contacts_workspace_rollup_delete
after delete on tracker.discovery_contacts
referencing old table as old_table
for each statement execute function tracker.workspace_contact_rollup_delete_trigger();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'workspace_contact_rollup_insert_trigger', '', 'function', 'Apply contact-count deltas to the workspace rollup after an insert statement.', 'maintenance', '026_contact_workspace_rollup_delta.sql'),
  ('tracker', 'workspace_contact_rollup_update_trigger', '', 'function', 'Apply net contact-count deltas to the workspace rollup after an update statement.', 'maintenance', '026_contact_workspace_rollup_delta.sql'),
  ('tracker', 'workspace_contact_rollup_delete_trigger', '', 'function', 'Apply contact-count deltas to the workspace rollup after a delete statement.', 'maintenance', '026_contact_workspace_rollup_delta.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
