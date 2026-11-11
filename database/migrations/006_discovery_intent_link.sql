begin;

alter table tracker.discovery_runs
  add column if not exists intent_id uuid references tracker.intent_requests(id);

create or replace view tracker_read.v_discovery_runs as
select
  id,
  research_project_id,
  researcher_id,
  tool,
  query,
  criteria,
  status,
  output,
  error,
  created_at,
  finished_at,
  intent_id
from tracker.discovery_runs;

drop function if exists tracker.start_discovery(uuid, text, text, text, jsonb);

create or replace function tracker.start_discovery(
  p_project uuid,
  p_intent uuid,
  p_researcher text,
  p_tool text,
  p_query text,
  p_criteria jsonb
)
returns setof tracker_read.v_discovery_runs
language plpgsql
as $$
declare
  v_id uuid;
  v_intent tracker.intent_requests;
begin
  if not exists (
    select 1 from tracker.research_projects
    where id = p_project and country_iso2 = 'OM' and status = 'active'
  ) then
    raise exception 'Select an active Oman project' using errcode = '22023';
  end if;

  select * into v_intent from tracker.intent_requests
    where id = p_intent and research_project_id = p_project and created_by = p_researcher
      and opportunity_kind = 'land_site' and status = 'active';
  if not found then
    raise exception 'Select an active intent owned by the researcher' using errcode = '22023';
  end if;

  if coalesce((p_criteria->>'targetItLoadMw')::numeric, 0) < 10 or
     coalesce((p_criteria->>'targetItLoadMw')::numeric, 0) > 10000 then
    raise exception 'Invalid target IT load' using errcode = '22023';
  end if;
  if (p_criteria->>'targetItLoadMw')::numeric <> (v_intent.criteria->>'targetItLoadMw')::numeric then
    raise exception 'Discovery criteria must match the saved intent' using errcode = '22023';
  end if;

  insert into tracker.discovery_runs(
    research_project_id,
    intent_id,
    researcher_id,
    tool,
    query,
    criteria
  )
  values (p_project, p_intent, p_researcher, p_tool, p_query, p_criteria)
  returning id into v_id;

  insert into tracker.audit_events(entity_type, entity_id, event_type, payload)
  values (
    'research_run',
    v_id,
    'started',
    jsonb_build_object('researcherId', p_researcher, 'intentId', p_intent, 'tool', p_tool)
  );

  return query select * from tracker_read.v_discovery_runs where id = v_id;
end $$;

create or replace function tracker.promote_discovery(p_run uuid,p_index integer,p_name text,p_location text,p_researcher text)
returns uuid language plpgsql as $$
declare r tracker.discovery_runs; candidate jsonb; v_parcel uuid;
begin
  select * into r from tracker.discovery_runs where id=p_run and researcher_id=p_researcher for update;
  if not found or r.status <> 'completed' or p_index is null or p_index<0 or p_index>=jsonb_array_length(r.output) then
    raise exception 'Select a completed discovery result owned by the researcher' using errcode='22023';
  end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 200 or coalesce(length(trim(p_location)),0) not between 5 and 1000 then
    raise exception 'Parcel name and specific location reference are required' using errcode='22023';
  end if;
  candidate := r.output->p_index;
  perform 1 from tracker.research_projects where id=r.research_project_id for update;
  select parcel_id into v_parcel from tracker.discovery_promotions
    where research_project_id=r.research_project_id and source_url=candidate->>'url';
  if found then return v_parcel; end if;
  select id into v_parcel from tracker.create_parcel(r.research_project_id,trim(p_name),(r.criteria->>'targetItLoadMw')::numeric);
  update tracker.parcels set location_description=trim(p_location),source_accuracy='analyst_inference' where id=v_parcel;
  insert into tracker.discovery_promotions(research_project_id,source_url,run_id,parcel_id,researcher_id)
    values(r.research_project_id,candidate->>'url',p_run,v_parcel,p_researcher);
  insert into tracker.audit_events(entity_type,entity_id,event_type,payload)
    values('parcel',v_parcel,'discovery_promoted',jsonb_build_object('runId',p_run,'source',candidate,'researcherId',p_researcher,'locationReference',p_location));
  return v_parcel;
end $$;

commit;
