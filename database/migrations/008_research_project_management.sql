begin;

create or replace function tracker.update_research_project(
  p_id uuid,
  p_name text,
  p_country_iso2 char(2),
  p_actor text
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
declare updated tracker.research_projects;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(trim(p_name)) > 200
     or p_country_iso2 is null or p_country_iso2 !~ '^[A-Za-z]{2}$' then
    raise exception 'Project name and two-letter country ISO code are required' using errcode = '22023';
  end if;
  update tracker.research_projects
    set name = trim(p_name), country_iso2 = upper(trim(p_country_iso2)), updated_at = now()
    where id = p_id
    returning * into updated;
  if not found then raise exception 'Research project was not found' using errcode = 'P0002'; end if;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
    values ('research_project', updated.id, 'updated', jsonb_build_object('actor', p_actor));
  return query select * from tracker_read.v_research_projects where tracker_read.v_research_projects.id = updated.id;
end;
$$;

create or replace function tracker.delete_research_project(p_id uuid, p_actor text)
returns table (id uuid, reference_code text, deleted boolean)
language plpgsql
as $$
declare existing tracker.research_projects;
begin
  select * into existing from tracker.research_projects where id = p_id for update;
  if not found then raise exception 'Research project was not found' using errcode = 'P0002'; end if;
  if exists (select 1 from tracker.parcels where research_project_id = p_id)
     or exists (select 1 from tracker.intent_requests where research_project_id = p_id)
     or exists (select 1 from tracker.discovery_runs where research_project_id = p_id)
     or exists (select 1 from tracker.discovery_promotions where research_project_id = p_id)
     or exists (select 1 from tracker.discovery_evidence e join tracker.discovery_runs r on r.id = e.run_id where r.research_project_id = p_id) then
    raise exception 'This project has saved requirements, parcels, or research runs. Close it instead or remove those records first.' using errcode = '23514';
  end if;
  delete from tracker.research_projects where id = p_id;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
    values ('research_project', existing.id, 'deleted', jsonb_build_object('actor', p_actor, 'referenceCode', existing.reference_code));
  return query select existing.id, existing.reference_code, true;
end;
$$;

commit;
