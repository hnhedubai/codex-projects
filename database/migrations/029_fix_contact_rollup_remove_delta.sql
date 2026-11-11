begin;

create or replace function tracker.jsonb_count_negate(p_delta jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  result jsonb := '{}'::jsonb;
  item record;
begin
  for item in
    select key, value::bigint as count_value
    from jsonb_each_text(coalesce(p_delta, '{}'::jsonb))
  loop
    result := jsonb_set(result, array[item.key], to_jsonb(-item.count_value), true);
  end loop;
  return result;
end;
$$;

create or replace function tracker.apply_discovery_contact_rollup_delta(
  p_researcher_id text,
  p_total_delta bigint,
  p_latest_candidate timestamptz,
  p_contact_type_remove jsonb,
  p_contact_type_add jsonb,
  p_organisation_remove jsonb,
  p_organisation_add jsonb,
  p_verification_remove jsonb,
  p_verification_add jsonb,
  p_recompute_latest boolean default false
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  current_rollup tracker.discovery_contact_rollups%rowtype;
  next_latest timestamptz;
  next_total bigint;
  next_contact_types jsonb;
  next_organisations jsonb;
  next_verification jsonb;
begin
  if p_researcher_id is null or length(trim(p_researcher_id)) = 0 then
    raise exception 'A researcher is required for contact rollup delta maintenance' using errcode = '22023';
  end if;

  select * into current_rollup
  from tracker.discovery_contact_rollups
  where researcher_id = p_researcher_id
  for update;

  if not found then
    if coalesce(p_total_delta, 0) <= 0 then
      perform tracker.refresh_discovery_contact_rollup(p_researcher_id);
      return;
    end if;
    current_rollup.researcher_id := p_researcher_id;
    current_rollup.total_count := 0;
    current_rollup.contact_type_counts := '{}'::jsonb;
    current_rollup.organisation_counts := '{}'::jsonb;
    current_rollup.verification_status_counts := '{}'::jsonb;
  end if;

  next_total := current_rollup.total_count + coalesce(p_total_delta, 0);
  if next_total <= 0 then
    delete from tracker.discovery_contact_rollups where researcher_id = p_researcher_id;
    return;
  end if;

  next_contact_types := tracker.jsonb_count_delta(current_rollup.contact_type_counts, tracker.jsonb_count_negate(p_contact_type_remove));
  next_contact_types := tracker.jsonb_count_delta(next_contact_types, p_contact_type_add);
  next_organisations := tracker.jsonb_count_delta(current_rollup.organisation_counts, tracker.jsonb_count_negate(p_organisation_remove));
  next_organisations := tracker.jsonb_count_delta(next_organisations, p_organisation_add);
  next_verification := tracker.jsonb_count_delta(current_rollup.verification_status_counts, tracker.jsonb_count_negate(p_verification_remove));
  next_verification := tracker.jsonb_count_delta(next_verification, p_verification_add);

  if p_recompute_latest then
    select max(created_at) into next_latest
    from tracker.discovery_contacts
    where researcher_id = p_researcher_id;
  else
    next_latest := greatest(current_rollup.latest_created_at, p_latest_candidate);
  end if;

  insert into tracker.discovery_contact_rollups (
    researcher_id, total_count, latest_created_at,
    contact_type_counts, organisation_counts, verification_status_counts, refreshed_at
  )
  values (
    p_researcher_id, next_total, next_latest,
    next_contact_types, next_organisations, next_verification, now()
  )
  on conflict (researcher_id) do update set
    total_count = excluded.total_count,
    latest_created_at = excluded.latest_created_at,
    contact_type_counts = excluded.contact_type_counts,
    organisation_counts = excluded.organisation_counts,
    verification_status_counts = excluded.verification_status_counts,
    refreshed_at = excluded.refreshed_at;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values (
  'tracker', 'jsonb_count_negate', 'p_delta jsonb', 'function', 'Convert a positive JSONB category-count map into signed removal deltas.', 'maintenance', '029_fix_contact_rollup_remove_delta.sql'
)
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

update tracker.routine_catalog
set source_migration = '029_fix_contact_rollup_remove_delta.sql',
    updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'apply_discovery_contact_rollup_delta'
  and routine_kind = 'function';

commit;
