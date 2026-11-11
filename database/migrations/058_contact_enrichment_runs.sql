begin;

-- Contact-source collection is not a land discovery run. Keep it in the same
-- auditable run/contact pipeline without inventing a research project or intent.
alter table tracker.discovery_runs
  alter column research_project_id drop not null;

alter table tracker.discovery_runs
  drop constraint if exists discovery_runs_tool_check,
  add constraint discovery_runs_tool_check
    check (tool in ('official_catalogue', 'exa', 'contact_enrichment'));

alter table tracker.discovery_runs
  drop constraint if exists discovery_runs_research_project_id_for_tool_check,
  add constraint discovery_runs_research_project_id_for_tool_check
    check (
      (tool = 'contact_enrichment' and research_project_id is null and intent_id is null)
      or (tool in ('official_catalogue', 'exa') and research_project_id is not null)
    );

create index if not exists discovery_runs_contact_enrichment_idx
  on tracker.discovery_runs (researcher_id, created_at desc, id)
  where tool = 'contact_enrichment';

create or replace function tracker.start_contact_enrichment(
  p_researcher text,
  p_query text,
  p_criteria jsonb
)
returns setof tracker_read.v_discovery_runs
language plpgsql
security definer
set search_path = pg_catalog, tracker
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_researcher), '') is null then
    raise exception 'A researcher is required' using errcode = '22023';
  end if;
  if nullif(trim(p_query), '') is null or length(trim(p_query)) > 500 then
    raise exception 'Contact enrichment query must contain 1 to 500 characters' using errcode = '22023';
  end if;
  if p_criteria is null or jsonb_typeof(p_criteria) <> 'object' then
    raise exception 'Contact enrichment criteria must be a JSON object' using errcode = '22023';
  end if;

  insert into tracker.discovery_runs (
    research_project_id, intent_id, researcher_id, tool, query, criteria
  ) values (
    null, null, trim(p_researcher), 'contact_enrichment', trim(p_query), p_criteria
  ) returning id into v_id;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'research_run', v_id, 'contact_enrichment_started',
    jsonb_build_object('researcherId', trim(p_researcher), 'query', trim(p_query))
  );

  return query select * from tracker_read.v_discovery_runs where id = v_id;
end;
$$;

create or replace function tracker.finish_contact_enrichment(
  p_run uuid,
  p_researcher text,
  p_output jsonb,
  p_error text
)
returns setof tracker_read.v_discovery_runs
language plpgsql
security definer
set search_path = pg_catalog, tracker
as $$
declare
  v_error text := nullif(left(trim(p_error), 2000), '');
begin
  if p_output is null or jsonb_typeof(p_output) <> 'array' or jsonb_array_length(p_output) > 8 then
    raise exception 'Contact enrichment output must be a JSON array with at most 8 results' using errcode = '22023';
  end if;
  if nullif(trim(p_researcher), '') is null then
    raise exception 'A researcher is required' using errcode = '22023';
  end if;

  update tracker.discovery_runs
  set output = p_output,
      error = v_error,
      status = case when v_error is null then 'completed' else 'failed' end,
      finished_at = now()
  where id = p_run
    and researcher_id = trim(p_researcher)
    and tool = 'contact_enrichment'
    and status = 'running';

  if not found then
    raise exception 'Contact enrichment run is not pending or is not owned by the researcher' using errcode = '22023';
  end if;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'research_run', p_run, 'contact_enrichment_finished',
    jsonb_build_object('researcherId', trim(p_researcher), 'error', v_error, 'resultCount', jsonb_array_length(p_output))
  );

  return query select * from tracker_read.v_discovery_runs where id = p_run;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  (
    'tracker', 'start_contact_enrichment', 'p_researcher text, p_query text, p_criteria jsonb', 'function',
    'Start a source-backed contact enrichment run without requiring a land project or intent.',
    'write', '058_contact_enrichment_runs.sql'
  ),
  (
    'tracker', 'finish_contact_enrichment', 'p_run uuid, p_researcher text, p_output jsonb, p_error text', 'function',
    'Close a bounded contact enrichment run with researcher ownership and an auditable status.',
    'write', '058_contact_enrichment_runs.sql'
  )
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set
  purpose = excluded.purpose,
  data_operation = excluded.data_operation,
  source_migration = excluded.source_migration,
  updated_at = now();

commit;
