begin;

create table if not exists tracker.discovery_contact_rollups (
  researcher_id text primary key check (length(trim(researcher_id)) > 0),
  total_count bigint not null check (total_count >= 0),
  latest_created_at timestamptz,
  contact_type_counts jsonb not null default '{}'::jsonb,
  organisation_counts jsonb not null default '{}'::jsonb,
  verification_status_counts jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

create or replace view tracker_read.v_discovery_contact_rollups as
select researcher_id, total_count, latest_created_at,
       contact_type_counts, organisation_counts, verification_status_counts,
       refreshed_at
from tracker.discovery_contact_rollups;

create or replace function tracker.refresh_discovery_contact_rollup(p_researcher_id text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if p_researcher_id is null or length(trim(p_researcher_id)) = 0 then
    raise exception 'A researcher is required for contact rollup refresh' using errcode = '22023';
  end if;

  if not exists (
    select 1 from tracker.discovery_contacts
    where researcher_id = p_researcher_id
  ) then
    delete from tracker.discovery_contact_rollups
    where researcher_id = p_researcher_id;
    return;
  end if;

  insert into tracker.discovery_contact_rollups (
    researcher_id, total_count, latest_created_at,
    contact_type_counts, organisation_counts, verification_status_counts, refreshed_at
  )
  values (
    p_researcher_id,
    (select count(*) from tracker.discovery_contacts where researcher_id = p_researcher_id),
    (select max(created_at) from tracker.discovery_contacts where researcher_id = p_researcher_id),
    coalesce((select jsonb_object_agg(contact_type, item_count)
      from (select contact_type, count(*)::bigint as item_count
            from tracker.discovery_contacts where researcher_id = p_researcher_id
            group by contact_type) grouped), '{}'::jsonb),
    coalesce((select jsonb_object_agg(organisation, item_count)
      from (select coalesce(nullif(organisation, ''), '(unassigned)') as organisation, count(*)::bigint as item_count
            from tracker.discovery_contacts where researcher_id = p_researcher_id
            group by coalesce(nullif(organisation, ''), '(unassigned)')) grouped), '{}'::jsonb),
    coalesce((select jsonb_object_agg(verification_status, item_count)
      from (select verification_status, count(*)::bigint as item_count
            from tracker.discovery_contacts where researcher_id = p_researcher_id
            group by verification_status) grouped), '{}'::jsonb),
    now()
  )
  on conflict (researcher_id) do update set
    total_count = excluded.total_count,
    latest_created_at = excluded.latest_created_at,
    contact_type_counts = excluded.contact_type_counts,
    organisation_counts = excluded.organisation_counts,
    verification_status_counts = excluded.verification_status_counts,
    refreshed_at = excluded.refreshed_at;
end;
$$;

create or replace function tracker.discovery_contact_rollup_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform tracker.refresh_discovery_contact_rollup(old.researcher_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform tracker.refresh_discovery_contact_rollup(new.researcher_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists discovery_contacts_rollup_after_change on tracker.discovery_contacts;
create trigger discovery_contacts_rollup_after_change
after insert or update or delete on tracker.discovery_contacts
for each row execute function tracker.discovery_contact_rollup_trigger();

create or replace procedure tracker.refresh_discovery_contact_rollups()
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  rollup_researcher record;
begin
  delete from tracker.discovery_contact_rollups rollup
  where not exists (
    select 1 from tracker.discovery_contacts contact
    where contact.researcher_id = rollup.researcher_id
  );
  for rollup_researcher in
    select distinct researcher_id from tracker.discovery_contacts
  loop
    perform tracker.refresh_discovery_contact_rollup(rollup_researcher.researcher_id);
  end loop;
end;
$$;

call tracker.refresh_discovery_contact_rollups();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'refresh_discovery_contact_rollup', 'p_researcher_id text', 'function', 'Rebuild one researcher contact summary from the source-of-truth contact records.', 'maintenance', '013_discovery_contact_rollups.sql'),
  ('tracker', 'discovery_contact_rollup_trigger', '', 'function', 'Keep contact rollups synchronized for insert, update, and delete operations.', 'maintenance', '013_discovery_contact_rollups.sql'),
  ('tracker', 'refresh_discovery_contact_rollups', '', 'procedure', 'Rebuild all contact summaries and remove summaries for researchers with no remaining records.', 'maintenance', '013_discovery_contact_rollups.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
