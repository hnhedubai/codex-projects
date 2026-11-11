begin;

/*
  A research project needs one durable, natural-language brief.  Keep the
  structured intent fields separate: this brief is the stable human input that
  can seed future intent and Exa prompt builders without adding a new column
  for every product, sector, or transaction type.
*/

alter table tracker.research_projects
  add column if not exists research_brief text not null default '';

alter table tracker.research_projects
  drop constraint if exists research_projects_research_brief_length_check;

alter table tracker.research_projects
  add constraint research_projects_research_brief_length_check
  check (length(research_brief) <= 4000);

create or replace view tracker_read.v_research_project_briefs as
select
  id as research_project_id,
  research_brief,
  updated_at
from tracker.research_projects;

create or replace function tracker_read.list_research_project_briefs(
  p_project_ids uuid[]
)
returns table (
  research_project_id uuid,
  research_brief text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
  select
    brief.research_project_id,
    brief.research_brief,
    brief.updated_at
  from tracker_read.v_research_project_briefs brief
  where p_project_ids is null
     or brief.research_project_id = any(p_project_ids)
  order by brief.research_project_id;
$$;

create or replace function tracker.create_research_project_with_brief(
  p_name text,
  p_country_iso2 char(2),
  p_research_brief text
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
security invoker
as $$
declare
  created_id uuid;
  normalized_brief text := coalesce(trim(p_research_brief), '');
begin
  if length(normalized_brief) > 4000 then
    raise exception 'Research brief must be at most 4000 characters' using errcode = '22023';
  end if;

  select created.id
    into created_id
  from tracker.create_research_project(p_name, p_country_iso2) created;

  update tracker.research_projects
     set research_brief = normalized_brief,
         updated_at = now()
   where tracker.research_projects.id = created_id;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'research_project',
    created_id,
    'brief_set',
    jsonb_build_object('field', 'research_brief', 'characterCount', length(normalized_brief))
  );

  return query
  select *
  from tracker_read.v_research_projects
  where tracker_read.v_research_projects.id = created_id;
end;
$$;

create or replace function tracker.update_research_project_with_brief(
  p_id uuid,
  p_name text,
  p_country_iso2 char(2),
  p_research_brief text,
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
security invoker
as $$
declare
  normalized_brief text := coalesce(trim(p_research_brief), '');
  updated_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(trim(p_name)) > 200
     or p_country_iso2 is null or p_country_iso2 !~ '^[A-Za-z]{2}$'
     or length(normalized_brief) > 4000 then
    raise exception 'Project name, country ISO code, and research brief are invalid' using errcode = '22023';
  end if;

  update tracker.research_projects
     set name = trim(p_name),
         country_iso2 = upper(trim(p_country_iso2)),
         research_brief = normalized_brief,
         updated_at = now()
   where tracker.research_projects.id = p_id
   returning tracker.research_projects.id into updated_id;

  if not found then
    raise exception 'Research project was not found' using errcode = 'P0002';
  end if;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'research_project',
    updated_id,
    'updated',
    jsonb_build_object('actor', p_actor, 'field', 'research_brief', 'characterCount', length(normalized_brief))
  );

  return query
  select *
  from tracker_read.v_research_projects
  where tracker_read.v_research_projects.id = updated_id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker_read', 'list_research_project_briefs', 'p_project_ids uuid[]', 'function', 'Return semantic research briefs for a bounded project page without changing the project read model.', 'read', '057_research_project_semantic_brief.sql'),
  ('tracker', 'create_research_project_with_brief', 'p_name text, p_country_iso2 character, p_research_brief text', 'function', 'Create a research project and its natural-language brief through one audited write boundary.', 'write', '057_research_project_semantic_brief.sql'),
  ('tracker', 'update_research_project_with_brief', 'p_id uuid, p_name text, p_country_iso2 character, p_research_brief text, p_actor text', 'function', 'Update project identity and natural-language brief through one audited write boundary.', 'write', '057_research_project_semantic_brief.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
