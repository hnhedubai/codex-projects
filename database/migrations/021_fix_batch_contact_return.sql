begin;

create or replace function tracker.record_discovery_contacts(
  p_run uuid,
  p_researcher text,
  p_contacts jsonb
)
returns setof tracker_read.v_discovery_contacts
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  contact_count integer;
  upserted_ids uuid[];
begin
  if jsonb_typeof(p_contacts) <> 'array' then
    raise exception 'Contact batch must be a JSON array' using errcode = '22023';
  end if;
  contact_count := jsonb_array_length(p_contacts);
  if contact_count > 20 then
    raise exception 'Contact batch cannot contain more than 20 records' using errcode = '22023';
  end if;
  if not exists (
    select 1 from tracker.discovery_runs
    where id = p_run and researcher_id = p_researcher and status = 'completed'
  ) then
    raise exception 'Select a completed discovery run owned by the researcher' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_contacts) item
    where case when item->>'resultIndex' ~ '^[0-9]+$' then (item->>'resultIndex')::integer else -1 end not between 0 and 7
       or case when item->>'rank' ~ '^[0-9]+$' then (item->>'rank')::integer else 0 end < 1
       or nullif(trim(item->>'websiteUrl'), '') is null
       or nullif(trim(item->>'sourceUrl'), '') is null
  ) then
    raise exception 'Each contact needs a valid result index, rank, website URL, and source URL' using errcode = '22023';
  end if;

  with upserted as (
    insert into tracker.discovery_contacts (
      run_id, result_index, researcher_id, contact_type, organisation, department,
      person_name, role, email, phone, website_url, linkedin_url, source_url,
      evidence_excerpt, confidence, verification_status, rank
    )
    select
      p_run,
      (item->>'resultIndex')::integer,
      p_researcher,
      coalesce(nullif(trim(item->>'contactType'), ''), 'authority_route'),
      nullif(trim(item->>'organisation'), ''),
      nullif(trim(item->>'department'), ''),
      nullif(trim(item->>'personName'), ''),
      nullif(trim(item->>'role'), ''),
      nullif(trim(item->>'email'), ''),
      nullif(trim(item->>'phone'), ''),
      trim(item->>'websiteUrl'),
      nullif(trim(item->>'linkedinUrl'), ''),
      trim(item->>'sourceUrl'),
      nullif(trim(item->>'evidenceExcerpt'), ''),
      least(greatest(case when item->>'confidence' ~ '^[0-9]+([.][0-9]+)?$' then (item->>'confidence')::numeric else .5 end, 0), 1),
      coalesce(nullif(trim(item->>'verificationStatus'), ''), 'official_source_observation'),
      (item->>'rank')::integer
    from jsonb_array_elements(p_contacts) item
    on conflict (run_id, result_index, website_url, email, phone) do update set
      organisation = excluded.organisation,
      department = excluded.department,
      person_name = excluded.person_name,
      role = excluded.role,
      source_url = excluded.source_url,
      evidence_excerpt = excluded.evidence_excerpt,
      confidence = excluded.confidence,
      verification_status = excluded.verification_status,
      rank = excluded.rank,
      created_at = now()
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into upserted_ids
  from upserted;

  if cardinality(upserted_ids) > 0 then
    return query
    select contact.*
    from tracker_read.v_discovery_contacts contact
    where contact.id = any(upserted_ids)
    order by contact.rank, contact.id;
  end if;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'research_run',
    p_run,
    'authority_contacts_discovered_batch',
    jsonb_build_object('researcherId', p_researcher, 'recordCount', contact_count)
  );
end;
$$;

update tracker.routine_catalog
set source_migration = '021_fix_batch_contact_return.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'record_discovery_contacts'
  and identity_arguments = 'p_run uuid, p_researcher text, p_contacts jsonb'
  and routine_kind = 'function';

commit;
