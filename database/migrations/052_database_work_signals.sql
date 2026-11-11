begin;

create or replace function tracker.notify_work_available()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, tracker
as $$
begin
  perform pg_notify('tracker_work_available', TG_TABLE_NAME);
  return new;
end;
$$;

drop trigger if exists discovery_contact_email_verification_work_signal
  on tracker.email_verification_jobs;
create trigger discovery_contact_email_verification_work_signal
after insert on tracker.email_verification_jobs
for each row execute function tracker.notify_work_available();

drop trigger if exists cprofile_firecrawl_work_signal
  on tracker.cprofile_firecrawl_jobs;
create trigger cprofile_firecrawl_work_signal
after insert on tracker.cprofile_firecrawl_jobs
for each row execute function tracker.notify_work_available();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration
)
values (
  'tracker', 'notify_work_available', '', 'function',
  'Signal the application worker after a provider task is inserted; the payload contains only the queue table name.',
  'write', '052_database_work_signals.sql'
)
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

commit;
