begin;

create index if not exists intent_requests_project_creator_created_idx
  on tracker.intent_requests (research_project_id, created_by, created_at desc);

create or replace function tracker_read.list_intent_requests(
  p_research_project_id uuid,
  p_created_by text,
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof tracker_read.v_intent_requests
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 then
    raise exception 'Intent page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select * from tracker_read.v_intent_requests
    where research_project_id = p_research_project_id
      and created_by = p_created_by
    order by created_at desc, id asc
    limit p_limit offset p_offset;
end;
$$;

create or replace function tracker_read.list_discovery_promotions(
  p_research_project_id uuid,
  p_researcher_id text,
  p_limit integer default 200,
  p_offset integer default 0
)
returns setof tracker_read.v_discovery_promotions
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
    raise exception 'Promotion page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  return query
    select * from tracker_read.v_discovery_promotions
    where research_project_id = p_research_project_id
      and researcher_id = p_researcher_id
    order by created_at desc, parcel_id asc
    limit p_limit offset p_offset;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker_read', 'list_intent_requests', 'p_research_project_id uuid, p_created_by text, p_limit integer, p_offset integer', 'function', 'Return a researcher-scoped, bounded page of saved discovery intents.', 'read', '022_bounded_intent_history_reads.sql'),
  ('tracker_read', 'list_discovery_promotions', 'p_research_project_id uuid, p_researcher_id text, p_limit integer, p_offset integer', 'function', 'Return a researcher-scoped, bounded page of promoted discovery results.', 'read', '022_bounded_intent_history_reads.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
