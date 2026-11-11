begin;

create table if not exists tracker.discovery_source_fetches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references tracker.discovery_runs(id),
  result_index integer not null check (result_index between 0 and 7),
  researcher_id text not null check (length(trim(researcher_id)) > 0),
  source_url text not null,
  final_url text,
  status_code integer,
  content_type text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  unique (run_id, result_index)
);

create or replace view tracker_read.v_discovery_source_fetches as
select id, run_id, result_index, researcher_id, source_url, final_url,
       status_code, content_type, content, metadata, error, created_at
from tracker.discovery_source_fetches;

create or replace function tracker.record_discovery_source_fetch(
  p_run uuid,
  p_index integer,
  p_researcher text,
  p_source_url text,
  p_final_url text,
  p_status_code integer,
  p_content_type text,
  p_content text,
  p_metadata jsonb,
  p_error text
)
returns setof tracker_read.v_discovery_source_fetches
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_index is null or p_index < 0 or p_index > 7 then
    raise exception 'Source result index is outside the allowed range' using errcode='22023';
  end if;
  if not exists (
    select 1 from tracker.discovery_runs
    where id = p_run and researcher_id = p_researcher and status = 'running'
  ) then
    raise exception 'Select a running discovery run owned by the researcher' using errcode='22023';
  end if;
  insert into tracker.discovery_source_fetches(
    run_id, result_index, researcher_id, source_url, final_url,
    status_code, content_type, content, metadata, error
  ) values (
    p_run, p_index, p_researcher, p_source_url, p_final_url,
    p_status_code, p_content_type, left(p_content, 500000), coalesce(p_metadata, '{}'::jsonb), p_error
  )
  on conflict (run_id, result_index) do update set
    source_url=excluded.source_url, final_url=excluded.final_url,
    status_code=excluded.status_code, content_type=excluded.content_type,
    content=excluded.content, metadata=excluded.metadata, error=excluded.error,
    created_at=now()
  returning id into v_id;
  insert into tracker.audit_events(entity_type, entity_id, event_type, payload)
  values ('research_run', p_run, 'source_fetched', jsonb_build_object(
    'index', p_index, 'sourceUrl', p_source_url, 'researcherId', p_researcher,
    'statusCode', p_status_code, 'error', p_error
  ));
  return query select * from tracker_read.v_discovery_source_fetches where id = v_id;
end $$;

commit;
