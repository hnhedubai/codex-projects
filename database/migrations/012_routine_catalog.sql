begin;

create table if not exists tracker.routine_catalog (
  routine_schema text not null default 'tracker',
  routine_name text not null,
  identity_arguments text not null default '',
  routine_kind text not null check (routine_kind in ('function', 'procedure')),
  purpose text not null check (length(trim(purpose)) > 0),
  data_operation text not null check (data_operation in ('read', 'write', 'maintenance')),
  source_migration text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (routine_schema, routine_name, identity_arguments, routine_kind)
);

create or replace view tracker_read.v_routine_catalog as
select routine_schema, routine_name, identity_arguments, routine_kind,
       purpose, data_operation, source_migration, enabled, created_at, updated_at
from tracker.routine_catalog;

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
    format('Document the purpose of tracker.%s(%s).', routine.proname,
      pg_get_function_identity_arguments(routine.oid)),
    case
      when routine.prokind = 'p' then 'maintenance'
      when pg_get_function_result(routine.oid) like '%%setof%%'
        or pg_get_function_result(routine.oid) like '%%TABLE%%' then 'read'
      else 'write'
    end
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'tracker'
    and routine.prokind in ('f', 'p')
  on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
  do update set updated_at = now();
end;
$$;

call tracker.refresh_routine_catalog();

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

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'create_research_project', 'p_name text, p_country_iso2 character', 'function', 'Create an Oman research project with a collision-safe reference code and audit event.', 'write', '001_tracker_foundation.sql'),
  ('tracker', 'create_parcel', 'p_research_project_id uuid, p_name text, p_target_it_load_mw numeric', 'function', 'Create a parcel linked to a research project after validating the target IT load.', 'write', '001_tracker_foundation.sql'),
  ('tracker', 'record_jev_vote', 'p_subject_type text, p_subject_id uuid, p_checkpoint text, p_outcome text, p_confidence numeric, p_reason text, p_input_snapshot jsonb, p_external_review_reference text', 'function', 'Record an append-only JEV review vote with provenance and audit data.', 'write', '002_jev_review_votes.sql'),
  ('tracker', 'update_research_project', 'p_id uuid, p_name text, p_country_iso2 character, p_actor text', 'function', 'Update a research project through validated, auditable DML.', 'write', '008_research_project_management.sql'),
  ('tracker', 'delete_research_project', 'p_id uuid, p_actor text', 'function', 'Delete a research project only through the controlled management boundary.', 'write', '008_research_project_management.sql'),
  ('tracker', 'create_intent_request', 'p_research_project_id uuid, p_created_by text, p_goal text, p_opportunity_kind text, p_geography text, p_sector text, p_criteria jsonb, p_exclusions text, p_priority text', 'function', 'Create a structured discovery intent with validated criteria and provenance.', 'write', '005_intent_requests.sql'),
  ('tracker', 'start_discovery', 'p_project uuid, p_intent uuid, p_researcher text, p_tool text, p_query text, p_criteria jsonb', 'function', 'Start a discovery run after validating the active Oman project and intent.', 'write', '006_discovery_intent_link.sql'),
  ('tracker', 'finish_discovery', 'p_run uuid, p_output jsonb, p_error text', 'function', 'Close a discovery run with bounded output and an auditable status.', 'write', '004_parcel_discovery.sql'),
  ('tracker', 'promote_discovery', 'p_run uuid, p_index integer, p_name text, p_location text, p_researcher text', 'function', 'Promote one completed discovery result into a parcel with duplicate protection.', 'write', '006_discovery_intent_link.sql'),
  ('tracker', 'record_discovery_source_fetch', 'p_run uuid, p_index integer, p_researcher text, p_source_url text, p_final_url text, p_status_code integer, p_content_type text, p_content text, p_metadata jsonb, p_error text', 'function', 'Persist source-fetch provenance for a discovery result.', 'write', '009_discovery_source_fetches.sql'),
  ('tracker', 'record_discovery_evidence', 'p_run uuid, p_index integer, p_researcher text, p_source_url text, p_evidence jsonb', 'function', 'Persist extracted evidence for a discovery result.', 'write', '007_discovery_evidence.sql'),
  ('tracker', 'record_discovery_contact', 'p_run uuid, p_index integer, p_researcher text, p_contact_type text, p_organisation text, p_department text, p_person_name text, p_role text, p_email text, p_phone text, p_website_url text, p_linkedin_url text, p_source_url text, p_evidence_excerpt text, p_confidence numeric, p_verification_status text, p_rank integer', 'function', 'Upsert a source-backed contact route while preserving ownership, validation, and audit provenance.', 'write', '010_discovery_contacts.sql'),
  ('tracker', 'refresh_routine_catalog', '', 'procedure', 'Synchronize the routine catalog with tracker functions and procedures without replacing documented purposes.', 'maintenance', '012_routine_catalog.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

delete from tracker.routine_catalog autogenerated
where autogenerated.purpose like 'Document the purpose of tracker.%'
  and exists (
    select 1
    from tracker.routine_catalog documented
    where documented.routine_schema = autogenerated.routine_schema
      and documented.routine_name = autogenerated.routine_name
      and documented.identity_arguments = autogenerated.identity_arguments
      and documented.routine_kind = autogenerated.routine_kind
      and documented.source_migration is not null
  );

commit;
