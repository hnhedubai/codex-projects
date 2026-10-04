begin;

create sequence if not exists tracker.research_project_reference_seq;
create sequence if not exists tracker.parcel_reference_seq;

create or replace function tracker.create_research_project(
  p_name text,
  p_country_iso2 char(2)
)
returns table (id uuid, reference_code text, name text, country_iso2 char(2), status text, created_at timestamptz, updated_at timestamptz)
language plpgsql as $$
declare created tracker.research_projects;
begin
  insert into tracker.research_projects (reference_code, name, country_iso2)
  values ('RP-' || upper(p_country_iso2) || '-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('tracker.research_project_reference_seq')::text, 4, '0'), trim(p_name), upper(p_country_iso2))
  returning * into created;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('research_project', created.id, 'created', jsonb_build_object('referenceCode', created.reference_code));
  return query select * from tracker_read.v_research_projects where tracker_read.v_research_projects.id = created.id;
end;
$$;

create or replace function tracker.create_parcel(p_research_project_id uuid, p_name text, p_target_it_load_mw numeric)
returns table (id uuid, reference_code text, research_project_id uuid, research_project_name text, name text, lifecycle_stage text, target_it_load_mw numeric, connected_capacity_mw numeric, firm_capacity_mw numeric, backup_capacity_mw numeric, expandable_capacity_mw numeric, land_area_m2 numeric, latitude numeric, longitude numeric, location_description text, map_url text, source_accuracy text, created_at timestamptz, updated_at timestamptz)
language plpgsql as $$
declare created tracker.parcels;
begin
  if p_target_it_load_mw < 10 then raise exception 'target IT load must be at least 10 MW' using errcode = 'check_violation'; end if;
  insert into tracker.parcels (reference_code, research_project_id, name, target_it_load_mw)
  values ('PAR-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('tracker.parcel_reference_seq')::text, 5, '0'), p_research_project_id, trim(p_name), p_target_it_load_mw)
  returning * into created;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('parcel', created.id, 'created', jsonb_build_object('referenceCode', created.reference_code));
  return query select * from tracker_read.v_parcels where tracker_read.v_parcels.id = created.id;
end;
$$;

commit;
