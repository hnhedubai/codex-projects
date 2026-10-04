begin;

create extension if not exists pgcrypto;

create schema if not exists tracker;
create schema if not exists tracker_read;

create table if not exists tracker.research_projects (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  name text not null check (length(trim(name)) > 0),
  country_iso2 char(2) not null check (country_iso2 = upper(country_iso2)),
  status text not null default 'active'
    check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracker.parcels (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  research_project_id uuid not null references tracker.research_projects(id),
  name text not null check (length(trim(name)) > 0),
  lifecycle_stage text not null default 'identified'
    check (lifecycle_stage in (
      'identified', 'screening', 'evidence_gathering', 'qualified',
      'allocation_ready', 'submitted', 'negotiation', 'allocated',
      'declined', 'dormant'
    )),
  target_it_load_mw numeric(12, 2) not null check (target_it_load_mw >= 10),
  connected_capacity_mw numeric(12, 2),
  firm_capacity_mw numeric(12, 2),
  backup_capacity_mw numeric(12, 2),
  expandable_capacity_mw numeric(12, 2),
  land_area_m2 numeric(18, 2),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  location_description text,
  map_url text,
  source_accuracy text check (source_accuracy in (
    'official_authority', 'signed_operator_confirmation',
    'provider_statement', 'gis_public_proxy', 'analyst_inference'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracker.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create or replace view tracker_read.v_research_projects as
select
  id,
  reference_code,
  name,
  country_iso2,
  status,
  created_at,
  updated_at
from tracker.research_projects;

create or replace view tracker_read.v_parcels as
select
  parcel.id,
  parcel.reference_code,
  parcel.research_project_id,
  project.name as research_project_name,
  parcel.name,
  parcel.lifecycle_stage,
  parcel.target_it_load_mw,
  parcel.connected_capacity_mw,
  parcel.firm_capacity_mw,
  parcel.backup_capacity_mw,
  parcel.expandable_capacity_mw,
  parcel.land_area_m2,
  parcel.latitude,
  parcel.longitude,
  parcel.location_description,
  parcel.map_url,
  parcel.source_accuracy,
  parcel.created_at,
  parcel.updated_at
from tracker.parcels parcel
join tracker.research_projects project on project.id = parcel.research_project_id;

create or replace function tracker.create_research_project(
  p_name text,
  p_country_iso2 char(2)
)
returns table (
  id uuid,
  reference_code text,
  name text,
  country_iso2 char(2),
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  created tracker.research_projects;
begin
  insert into tracker.research_projects (reference_code, name, country_iso2)
  values (
    'RP-' || upper(p_country_iso2) || '-' || to_char(current_date, 'YYYY') || '-' ||
      lpad((select (count(*) + 1)::text from tracker.research_projects), 4, '0'),
    trim(p_name),
    upper(p_country_iso2)
  )
  returning * into created;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('research_project', created.id, 'created', jsonb_build_object('referenceCode', created.reference_code));

  return query
  select * from tracker_read.v_research_projects where tracker_read.v_research_projects.id = created.id;
end;
$$;

create or replace function tracker.create_parcel(
  p_research_project_id uuid,
  p_name text,
  p_target_it_load_mw numeric
)
returns table (
  id uuid,
  reference_code text,
  research_project_id uuid,
  research_project_name text,
  name text,
  lifecycle_stage text,
  target_it_load_mw numeric,
  connected_capacity_mw numeric,
  firm_capacity_mw numeric,
  backup_capacity_mw numeric,
  expandable_capacity_mw numeric,
  land_area_m2 numeric,
  latitude numeric,
  longitude numeric,
  location_description text,
  map_url text,
  source_accuracy text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  created tracker.parcels;
begin
  if p_target_it_load_mw < 10 then
    raise exception 'target IT load must be at least 10 MW' using errcode = 'check_violation';
  end if;

  insert into tracker.parcels (reference_code, research_project_id, name, target_it_load_mw)
  values (
    'PAR-' || to_char(current_date, 'YYYY') || '-' ||
      lpad((select (count(*) + 1)::text from tracker.parcels), 5, '0'),
    p_research_project_id,
    trim(p_name),
    p_target_it_load_mw
  )
  returning * into created;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('parcel', created.id, 'created', jsonb_build_object('referenceCode', created.reference_code));

  return query
  select * from tracker_read.v_parcels where tracker_read.v_parcels.id = created.id;
end;
$$;

commit;
