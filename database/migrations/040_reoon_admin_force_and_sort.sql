begin;

create or replace function tracker_read.list_discovery_contacts(
  p_researcher_id text,
  p_limit integer default 25,
  p_offset integer default 0,
  p_since timestamptz default null,
  p_sort_key text default 'created_at',
  p_sort_direction text default 'asc'
)
returns setof tracker_read.v_discovery_contacts
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
declare
  order_column text;
  order_direction text;
begin
  if p_researcher_id is null or length(trim(p_researcher_id)) = 0 then
    raise exception 'A researcher is required for contact retrieval' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
    raise exception 'Contact page size or offset is outside the allowed range' using errcode = '22023';
  end if;
  order_column := case p_sort_key
    when 'organisation' then 'organisation'
    when 'person_name' then 'person_name'
    when 'role' then 'role'
    when 'department' then 'department'
    when 'email' then 'email'
    when 'phone' then 'phone'
    when 'contact_type' then 'contact_type'
    when 'confidence' then 'confidence'
    when 'verification_status' then 'verification_status'
    when 'email_verification_status' then 'email_verification_status'
    when 'email_verification_score' then 'email_verification_score'
    when 'email_verification_checked_at' then 'email_verification_checked_at'
    when 'email_next_verification_at' then 'email_next_verification_at'
    when 'evidence_excerpt' then 'evidence_excerpt'
    when 'website_url' then 'website_url'
    when 'linkedin_url' then 'linkedin_url'
    when 'source_url' then 'source_url'
    when 'rank' then 'rank'
    when 'created_at' then 'created_at'
    else 'created_at'
  end;
  order_direction := case when lower(p_sort_direction) = 'desc' then 'desc' else 'asc' end;
  return query execute format(
    'select * from tracker_read.v_discovery_contacts
     where researcher_id = $1 and ($2 is null or created_at > $2)
     order by %I %s nulls last, id asc limit $3 offset $4',
    order_column, order_direction
  ) using p_researcher_id, p_since, p_limit, p_offset;
end;
$$;

create or replace function tracker.force_contact_email_reverification(
  p_contact_id uuid,
  p_actor_id text,
  p_reason text
)
returns setof tracker_read.v_email_verification_jobs
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  job_id uuid;
begin
  if nullif(trim(p_actor_id), '') is null or nullif(trim(p_reason), '') is null then
    raise exception 'An actor and force-reverification reason are required' using errcode = '22023';
  end if;
  if not exists (select 1 from tracker.discovery_contacts where id = p_contact_id) then
    raise exception 'Contact was not found' using errcode = '22023';
  end if;
  job_id := tracker.enqueue_contact_email_verification(p_contact_id, 'admin_forced');
  if job_id is null then
    raise exception 'Contact has no email available for re-verification' using errcode = '22023';
  end if;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('contact', p_contact_id, 'reoon_email_reverification_forced', jsonb_build_object(
    'actorId', trim(p_actor_id), 'reason', left(trim(p_reason), 500), 'jobId', job_id
  ));
  return query select * from tracker_read.v_email_verification_jobs where id = job_id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration
)
values
  ('tracker', 'force_contact_email_reverification', 'p_contact_id uuid, p_actor_id text, p_reason text', 'function', 'Create an audited Reoon Power Mode re-verification job requested by an authorized administrator.', 'write', '040_reoon_admin_force_and_sort.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

update tracker.routine_catalog
set source_migration = '040_reoon_admin_force_and_sort.sql', updated_at = now()
where routine_schema = 'tracker_read'
  and routine_name = 'list_discovery_contacts'
  and identity_arguments = 'p_researcher_id text, p_limit integer, p_offset integer, p_since timestamp with time zone, p_sort_key text, p_sort_direction text'
  and routine_kind = 'function';

commit;
