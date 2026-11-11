begin;

create table if not exists tracker.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references tracker.research_projects(id),
  researcher_id text not null check (length(trim(researcher_id)) > 0),
  tool text not null check (tool in ('official_catalogue', 'exa')),
  query text not null check (length(query) between 1 and 500),
  criteria jsonb not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  output jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table if not exists tracker.discovery_promotions (
  research_project_id uuid not null references tracker.research_projects(id),
  source_url text not null,
  run_id uuid not null references tracker.discovery_runs(id),
  parcel_id uuid not null references tracker.parcels(id),
  researcher_id text not null,
  created_at timestamptz not null default now(),
  primary key (research_project_id, source_url)
);
create or replace view tracker_read.v_discovery_runs as select * from tracker.discovery_runs;
create or replace view tracker_read.v_discovery_promotions as select * from tracker.discovery_promotions;

create or replace function tracker.start_discovery(p_project uuid, p_researcher text, p_tool text, p_query text, p_criteria jsonb)
returns setof tracker_read.v_discovery_runs language plpgsql as $$
declare v_id uuid;
begin
  if not exists(select 1 from tracker.research_projects where id=p_project and country_iso2='OM' and status='active') then
    raise exception 'Select an active Oman project' using errcode='22023';
  end if;
  if coalesce((p_criteria->>'targetItLoadMw')::numeric,0) < 10 or
     coalesce((p_criteria->>'targetItLoadMw')::numeric,0) > 10000 then
    raise exception 'Invalid target IT load' using errcode='22023';
  end if;
  insert into tracker.discovery_runs(research_project_id,researcher_id,tool,query,criteria)
    values(p_project,p_researcher,p_tool,p_query,p_criteria) returning id into v_id;
  insert into tracker.audit_events(entity_type,entity_id,event_type,payload)
    values('research_run',v_id,'started',jsonb_build_object('researcherId',p_researcher,'tool',p_tool));
  return query select * from tracker_read.v_discovery_runs where id=v_id;
end $$;

create or replace function tracker.finish_discovery(p_run uuid,p_output jsonb,p_error text)
returns setof tracker_read.v_discovery_runs language plpgsql as $$
begin
  if jsonb_typeof(p_output) <> 'array' or jsonb_array_length(p_output)>8 then
    raise exception 'Invalid discovery output' using errcode='22023';
  end if;
  update tracker.discovery_runs set output=p_output,error=p_error,
    status=case when p_error is null then 'completed' else 'failed' end,finished_at=now()
    where id=p_run and status='running';
  if not found then raise exception 'Run is not pending' using errcode='22023'; end if;
  insert into tracker.audit_events(entity_type,entity_id,event_type,payload)
    values('research_run',p_run,'finished',jsonb_build_object('error',p_error,'resultCount',jsonb_array_length(p_output)));
  return query select * from tracker_read.v_discovery_runs where id=p_run;
end $$;

create or replace function tracker.promote_discovery(p_run uuid,p_index integer,p_name text,p_location text,p_researcher text)
returns uuid language plpgsql as $$
declare r tracker.discovery_runs; candidate jsonb; v_parcel uuid;
begin
  select * into r from tracker.discovery_runs where id=p_run for update;
  if not found or r.status <> 'completed' or p_index is null or p_index<0 or p_index>=jsonb_array_length(r.output) then
    raise exception 'Select a completed discovery result' using errcode='22023';
  end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 200 or coalesce(length(trim(p_location)),0) not between 5 and 1000 then
    raise exception 'Parcel name and specific location reference are required' using errcode='22023';
  end if;
  candidate := r.output->p_index;
  -- Serialize promotions across different runs of the same project.
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
