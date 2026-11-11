begin;

create or replace function tracker.jsonb_count_delta(p_current jsonb, p_delta jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  result jsonb := coalesce(p_current, '{}'::jsonb);
  item record;
  next_count bigint;
begin
  for item in
    select key, value::bigint as delta
    from jsonb_each_text(coalesce(p_delta, '{}'::jsonb))
  loop
    next_count := coalesce((result ->> item.key)::bigint, 0) + item.delta;
    if next_count <= 0 then
      result := result - item.key;
    else
      result := jsonb_set(result, array[item.key], to_jsonb(next_count), true);
    end if;
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

  next_contact_types := tracker.jsonb_count_delta(current_rollup.contact_type_counts, p_contact_type_remove);
  next_contact_types := tracker.jsonb_count_delta(next_contact_types, p_contact_type_add);
  next_organisations := tracker.jsonb_count_delta(current_rollup.organisation_counts, p_organisation_remove);
  next_organisations := tracker.jsonb_count_delta(next_organisations, p_organisation_add);
  next_verification := tracker.jsonb_count_delta(current_rollup.verification_status_counts, p_verification_remove);
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

create or replace function tracker.discovery_contact_rollup_statement_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  affected record;
  new_total bigint;
  old_total bigint;
  new_latest timestamptz;
  new_contact_types jsonb;
  old_contact_types jsonb;
  new_organisations jsonb;
  old_organisations jsonb;
  new_verification jsonb;
  old_verification jsonb;
begin
  if tg_op = 'INSERT' then
    for affected in select distinct researcher_id from new_table loop
      select count(*)::bigint, max(created_at) into new_total, new_latest
      from new_table where researcher_id = affected.researcher_id;
      select coalesce(jsonb_object_agg(grouped.contact_type, grouped.item_count), '{}'::jsonb)
      into new_contact_types
      from (select contact_type, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by contact_type) grouped;
      select coalesce(jsonb_object_agg(grouped.organisation, grouped.item_count), '{}'::jsonb)
      into new_organisations
      from (select coalesce(nullif(organisation, ''), '(unassigned)') as organisation, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by coalesce(nullif(organisation, ''), '(unassigned)')) grouped;
      select coalesce(jsonb_object_agg(grouped.verification_status, grouped.item_count), '{}'::jsonb)
      into new_verification
      from (select verification_status, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by verification_status) grouped;
      perform tracker.apply_discovery_contact_rollup_delta(affected.researcher_id, new_total, new_latest, '{}'::jsonb, new_contact_types, '{}'::jsonb, new_organisations, '{}'::jsonb, new_verification, false);
    end loop;
  elsif tg_op = 'DELETE' then
    for affected in select distinct researcher_id from old_table loop
      select count(*)::bigint into old_total from old_table where researcher_id = affected.researcher_id;
      select coalesce(jsonb_object_agg(grouped.contact_type, grouped.item_count), '{}'::jsonb)
      into old_contact_types
      from (select contact_type, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by contact_type) grouped;
      select coalesce(jsonb_object_agg(grouped.organisation, grouped.item_count), '{}'::jsonb)
      into old_organisations
      from (select coalesce(nullif(organisation, ''), '(unassigned)') as organisation, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by coalesce(nullif(organisation, ''), '(unassigned)')) grouped;
      select coalesce(jsonb_object_agg(grouped.verification_status, grouped.item_count), '{}'::jsonb)
      into old_verification
      from (select verification_status, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by verification_status) grouped;
      perform tracker.apply_discovery_contact_rollup_delta(affected.researcher_id, -old_total, null, old_contact_types, '{}'::jsonb, old_organisations, '{}'::jsonb, old_verification, '{}'::jsonb, true);
    end loop;
  else
    for affected in
      select distinct researcher_id from (select researcher_id from old_table union select researcher_id from new_table) changed
    loop
      select count(*)::bigint, max(created_at) into new_total, new_latest
      from new_table where researcher_id = affected.researcher_id;
      select count(*)::bigint into old_total
      from old_table where researcher_id = affected.researcher_id;
      select coalesce(jsonb_object_agg(grouped.contact_type, grouped.item_count), '{}'::jsonb)
      into new_contact_types
      from (select contact_type, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by contact_type) grouped;
      select coalesce(jsonb_object_agg(grouped.contact_type, grouped.item_count), '{}'::jsonb)
      into old_contact_types
      from (select contact_type, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by contact_type) grouped;
      select coalesce(jsonb_object_agg(grouped.organisation, grouped.item_count), '{}'::jsonb)
      into new_organisations
      from (select coalesce(nullif(organisation, ''), '(unassigned)') as organisation, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by coalesce(nullif(organisation, ''), '(unassigned)')) grouped;
      select coalesce(jsonb_object_agg(grouped.organisation, grouped.item_count), '{}'::jsonb)
      into old_organisations
      from (select coalesce(nullif(organisation, ''), '(unassigned)') as organisation, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by coalesce(nullif(organisation, ''), '(unassigned)')) grouped;
      select coalesce(jsonb_object_agg(grouped.verification_status, grouped.item_count), '{}'::jsonb)
      into new_verification
      from (select verification_status, count(*)::bigint as item_count from new_table where researcher_id = affected.researcher_id group by verification_status) grouped;
      select coalesce(jsonb_object_agg(grouped.verification_status, grouped.item_count), '{}'::jsonb)
      into old_verification
      from (select verification_status, count(*)::bigint as item_count from old_table where researcher_id = affected.researcher_id group by verification_status) grouped;
      perform tracker.apply_discovery_contact_rollup_delta(affected.researcher_id, new_total - old_total, new_latest, old_contact_types, new_contact_types, old_organisations, new_organisations, old_verification, new_verification, true);
    end loop;
  end if;
  return null;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'jsonb_count_delta', 'p_current jsonb, p_delta jsonb', 'function', 'Apply signed category-count changes to a JSONB counter map without scanning source records.', 'maintenance', '028_contact_rollup_delta_maintenance.sql'),
  ('tracker', 'apply_discovery_contact_rollup_delta', 'p_researcher_id text, p_total_delta bigint, p_latest_candidate timestamp with time zone, p_contact_type_remove jsonb, p_contact_type_add jsonb, p_organisation_remove jsonb, p_organisation_add jsonb, p_verification_remove jsonb, p_verification_add jsonb, p_recompute_latest boolean', 'function', 'Maintain one researcher contact rollup from transition-table deltas, repairing latest timestamp only when needed.', 'maintenance', '028_contact_rollup_delta_maintenance.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

update tracker.routine_catalog
set purpose = 'Maintain researcher contact rollups from statement-level transition deltas, including category counts and latest timestamps.',
    source_migration = '028_contact_rollup_delta_maintenance.sql',
    updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'discovery_contact_rollup_statement_trigger'
  and routine_kind = 'function';

commit;
