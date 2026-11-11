begin;

create table if not exists tracker.discovery_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references tracker.discovery_runs(id),
  result_index integer not null check (result_index between 0 and 7),
  researcher_id text not null check (length(trim(researcher_id)) > 0),
  source_url text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, result_index)
);

create or replace view tracker_read.v_discovery_evidence as
select id, run_id, result_index, researcher_id, source_url, evidence, created_at
from tracker.discovery_evidence;

create or replace function tracker.record_discovery_evidence(
  p_run uuid,
  p_index integer,
  p_researcher text,
  p_source_url text,
  p_evidence jsonb
)
returns setof tracker_read.v_discovery_evidence
language plpgsql
as $$
declare
  v_candidate jsonb;
  v_id uuid;
begin
  select output->p_index into v_candidate
  from tracker.discovery_runs
  where id = p_run and researcher_id = p_researcher and status = 'completed'
  for update;
  if not found or v_candidate->>'url' <> p_source_url then
    raise exception 'Select a completed discovery result owned by the researcher' using errcode='22023';
  end if;
  insert into tracker.discovery_evidence(run_id, result_index, researcher_id, source_url, evidence)
  values (p_run, p_index, p_researcher, p_source_url, p_evidence)
  on conflict (run_id, result_index) do update set evidence=excluded.evidence, source_url=excluded.source_url, created_at=now()
  returning id into v_id;
  insert into tracker.audit_events(entity_type, entity_id, event_type, payload)
  values ('research_run', p_run, 'evidence_extracted', jsonb_build_object('index', p_index, 'sourceUrl', p_source_url, 'researcherId', p_researcher));
  return query select * from tracker_read.v_discovery_evidence where id = v_id;
end $$;

commit;
