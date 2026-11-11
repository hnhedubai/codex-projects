begin;

create or replace function tracker.discovery_contact_rollup_statement_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  affected record;
begin
  if tg_op = 'INSERT' then
    for affected in select distinct researcher_id from new_table loop
      perform tracker.refresh_discovery_contact_rollup(affected.researcher_id);
    end loop;
  elsif tg_op = 'DELETE' then
    for affected in select distinct researcher_id from old_table loop
      perform tracker.refresh_discovery_contact_rollup(affected.researcher_id);
    end loop;
  else
    for affected in
      select distinct researcher_id
      from (
        select researcher_id from old_table
        union
        select researcher_id from new_table
      ) changed
    loop
      perform tracker.refresh_discovery_contact_rollup(affected.researcher_id);
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists discovery_contacts_rollup_after_change on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_rollup_after_insert on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_rollup_after_update on tracker.discovery_contacts;
drop trigger if exists discovery_contacts_rollup_after_delete on tracker.discovery_contacts;

create trigger discovery_contacts_rollup_after_insert
after insert on tracker.discovery_contacts
referencing new table as new_table
for each statement execute function tracker.discovery_contact_rollup_statement_trigger();

create trigger discovery_contacts_rollup_after_update
after update on tracker.discovery_contacts
referencing old table as old_table new table as new_table
for each statement execute function tracker.discovery_contact_rollup_statement_trigger();

create trigger discovery_contacts_rollup_after_delete
after delete on tracker.discovery_contacts
referencing old table as old_table
for each statement execute function tracker.discovery_contact_rollup_statement_trigger();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values (
  'tracker', 'discovery_contact_rollup_statement_trigger', '', 'function',
  'Refresh each affected researcher contact rollup once per DML statement, including batched changes.',
  'maintenance', '014_contact_rollup_statement_trigger.sql'
)
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
