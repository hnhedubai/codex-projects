begin;

create or replace function tracker.record_contact_email_verification(
  p_job_id uuid,
  p_worker_id text,
  p_result jsonb
)
returns setof tracker_read.v_discovery_contacts
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  job tracker.email_verification_jobs;
  contact_row tracker.discovery_contacts;
  v_provider_status text;
  v_interval_days integer;
  normalized_result jsonb;
begin
  select * into job from tracker.email_verification_jobs
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
    and (lease_until is null or lease_until > now());
  if not found then raise exception 'Verification job is not owned by this worker' using errcode = '22023'; end if;

  v_provider_status := lower(coalesce(p_result->>'status', ''));
  if v_provider_status not in ('safe', 'invalid', 'disabled', 'disposable', 'inbox_full', 'catch_all', 'role_account', 'spamtrap', 'unknown')
     or coalesce(p_result->>'verificationMode', '') <> 'power' then
    raise exception 'Reoon result must be a valid Power Mode response' using errcode = '22023';
  end if;

  select * into contact_row from tracker.discovery_contacts where id = job.contact_id;
  if not found or lower(trim(coalesce(contact_row.email, ''))) <> lower(trim(job.email_snapshot)) then
    raise exception 'Contact email changed while verification was in progress' using errcode = '22023';
  end if;

  normalized_result := jsonb_build_object(
    'email', p_result->>'email', 'status', v_provider_status,
    'overallScore', p_result->'overallScore', 'verificationMode', 'power',
    'isSafeToSend', p_result->'isSafeToSend', 'isValidSyntax', p_result->'isValidSyntax',
    'isDisposable', p_result->'isDisposable', 'isRoleAccount', p_result->'isRoleAccount',
    'canConnectSmtp', p_result->'canConnectSmtp', 'hasInboxFull', p_result->'hasInboxFull',
    'isCatchAll', p_result->'isCatchAll', 'isDeliverable', p_result->'isDeliverable',
    'isDisabled', p_result->'isDisabled', 'isSpamtrap', p_result->'isSpamtrap',
    'isFreeEmail', p_result->'isFreeEmail', 'mxAcceptsMail', p_result->'mxAcceptsMail',
    'mxRecords', coalesce(p_result->'mxRecords', '[]'::jsonb)
  );

  insert into tracker.email_verification_attempts (
    job_id, contact_id, email_snapshot, provider_status, verification_mode,
    overall_score, is_safe_to_send, is_valid_syntax, is_disposable,
    is_role_account, can_connect_smtp, has_inbox_full, is_catch_all,
    is_deliverable, is_disabled, is_spamtrap, is_free_email, mx_accepts_mail,
    mx_records, raw_result
  ) values (
    job.id, job.contact_id, job.email_snapshot, v_provider_status, 'power',
    nullif(p_result->>'overallScore', '')::numeric,
    (p_result->>'isSafeToSend')::boolean, (p_result->>'isValidSyntax')::boolean,
    (p_result->>'isDisposable')::boolean, (p_result->>'isRoleAccount')::boolean,
    (p_result->>'canConnectSmtp')::boolean, (p_result->>'hasInboxFull')::boolean,
    (p_result->>'isCatchAll')::boolean, (p_result->>'isDeliverable')::boolean,
    (p_result->>'isDisabled')::boolean, (p_result->>'isSpamtrap')::boolean,
    (p_result->>'isFreeEmail')::boolean, (p_result->>'mxAcceptsMail')::boolean,
    coalesce(p_result->'mxRecords', '[]'::jsonb), coalesce(p_result->'raw', normalized_result)
  );

  select policy.interval_days into v_interval_days
  from tracker.email_verification_policy policy
  where policy.provider_status = v_provider_status
    and policy.enabled and policy.automatic_reverify;

  update tracker.discovery_contacts
  set email_verification_status = v_provider_status,
      email_verification_score = nullif(p_result->>'overallScore', '')::numeric,
      email_is_safe_to_send = (p_result->>'isSafeToSend')::boolean,
      email_verification_mode = 'power',
      email_verification_checked_at = now(),
      email_next_verification_at = case when v_interval_days is null then null else now() + make_interval(days => v_interval_days) end
  where id = job.contact_id;

  update tracker.email_verification_jobs
  set status = 'completed', completed_at = now(), lease_until = null
  where id = job.id;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('contact', job.contact_id, 'reoon_email_verified', jsonb_build_object(
    'jobId', job.id, 'status', v_provider_status, 'mode', 'power', 'score', p_result->'overallScore'
  ));

  return query select * from tracker_read.v_discovery_contacts where id = job.contact_id;
end;
$$;

update tracker.routine_catalog
set source_migration = '037_fix_reoon_provider_status_reference.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'record_contact_email_verification'
  and identity_arguments = 'p_job_id uuid, p_worker_id text, p_result jsonb'
  and routine_kind = 'function';

commit;

