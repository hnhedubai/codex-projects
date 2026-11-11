begin;

create sequence if not exists tracker.intent_reference_seq;

create table if not exists tracker.intent_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  research_project_id uuid not null references tracker.research_projects(id),
  created_by text not null check (length(trim(created_by)) > 0),
  goal text not null check (length(trim(goal)) between 1 and 500),
  opportunity_kind text not null check (opportunity_kind in (
    'land_site', 'investor', 'buyer', 'seller',
    'manufacturer_destination', 'project'
  )),
  geography text not null check (length(trim(geography)) between 1 and 200),
  sector text check (sector is null or length(trim(sector)) <= 200),
  criteria jsonb not null default '{}'::jsonb,
  exclusions text check (exclusions is null or length(trim(exclusions)) <= 1000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intent_requests_project_idx
  on tracker.intent_requests (research_project_id, created_at desc);

create or replace view tracker_read.v_intent_requests as
select
  id,
  reference_code,
  research_project_id,
  created_by,
  goal,
  opportunity_kind,
  geography,
  sector,
  criteria,
  exclusions,
  priority,
  status,
  created_at,
  updated_at
from tracker.intent_requests;

create or replace function tracker.create_intent_request(
  p_research_project_id uuid,
  p_created_by text,
  p_goal text,
  p_opportunity_kind text,
  p_geography text,
  p_sector text default null,
  p_criteria jsonb default '{}'::jsonb,
  p_exclusions text default null,
  p_priority text default 'normal'
)
returns table (
  id uuid,
  reference_code text,
  research_project_id uuid,
  created_by text,
  goal text,
  opportunity_kind text,
  geography text,
  sector text,
  criteria jsonb,
  exclusions text,
  priority text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  created tracker.intent_requests;
begin
  if not exists (
    select 1 from tracker.research_projects
    where tracker.research_projects.id = p_research_project_id and tracker.research_projects.status = 'active'
  ) then
    raise exception 'Select an active research project' using errcode = '22023';
  end if;

  if p_created_by is null or length(trim(p_created_by)) = 0 then
    raise exception 'An authenticated researcher is required' using errcode = '22023';
  end if;

  if p_opportunity_kind = 'land_site' and
     coalesce((p_criteria->>'targetItLoadMw')::numeric, 0) not between 10 and 10000 then
    raise exception 'land_site intents require a target IT load between 10 and 10,000 MW'
      using errcode = '22023';
  end if;

  insert into tracker.intent_requests (
    reference_code,
    research_project_id,
    created_by,
    goal,
    opportunity_kind,
    geography,
    sector,
    criteria,
    exclusions,
    priority
  )
  values (
    'INT-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('tracker.intent_reference_seq')::text, 5, '0'),
    p_research_project_id,
    trim(p_created_by),
    trim(p_goal),
    p_opportunity_kind,
    trim(p_geography),
    nullif(trim(p_sector), ''),
    coalesce(p_criteria, '{}'::jsonb),
    nullif(trim(p_exclusions), ''),
    coalesce(p_priority, 'normal')
  )
  returning * into created;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'intent_request',
    created.id,
    'created',
    jsonb_build_object('referenceCode', created.reference_code, 'opportunityKind', created.opportunity_kind, 'createdBy', created.created_by)
  );

  return query
  select * from tracker_read.v_intent_requests
  where tracker_read.v_intent_requests.id = created.id;
end;
$$;

commit;
