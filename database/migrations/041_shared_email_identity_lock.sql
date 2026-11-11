begin;

create table if not exists tracker.email_identities (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  email_verification_status text,
  email_verification_score numeric(5,2),
  email_is_safe_to_send boolean,
  email_verification_mode text,
  email_verification_checked_at timestamptz,
  email_next_verification_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracker.email_identity_contacts (
  email_identity_id uuid not null references tracker.email_identities(id) on delete cascade,
  contact_id uuid not null references tracker.discovery_contacts(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (email_identity_id, contact_id),
  unique (contact_id)
);

insert into tracker.email_identities (
  normalized_email, email_verification_status, email_verification_score,
  email_is_safe_to_send, email_verification_mode,
  email_verification_checked_at, email_next_verification_at
)
select distinct on (lower(trim(contact.email)))
  lower(trim(contact.email)), contact.email_verification_status,
  contact.email_verification_score, contact.email_is_safe_to_send,
  contact.email_verification_mode, contact.email_verification_checked_at,
  contact.email_next_verification_at
from tracker.discovery_contacts contact
where nullif(trim(contact.email), '') is not null
order by lower(trim(contact.email)), contact.email_verification_checked_at desc nulls last, contact.created_at desc, contact.id;

insert into tracker.email_identity_contacts (email_identity_id, contact_id)
select identity.id, contact.id
from tracker.discovery_contacts contact
join tracker.email_identities identity on identity.normalized_email = lower(trim(contact.email))
where nullif(trim(contact.email), '') is not null
on conflict (contact_id) do update set email_identity_id = excluded.email_identity_id, linked_at = now();

alter table tracker.email_verification_jobs
  add column if not exists email_identity_id uuid references tracker.email_identities(id);

alter table tracker.email_verification_attempts
  add column if not exists email_identity_id uuid references tracker.email_identities(id);

update tracker.email_verification_jobs job
set email_identity_id = link.email_identity_id
from tracker.email_identity_contacts link
where link.contact_id = job.contact_id and job.email_identity_id is null;

update tracker.email_verification_attempts attempt
set email_identity_id = link.email_identity_id
from tracker.email_identity_contacts link
where link.contact_id = attempt.contact_id and attempt.email_identity_id is null;

drop index if exists tracker.email_verification_jobs_active_idx;

create unique index if not exists email_verification_jobs_active_identity_idx
  on tracker.email_verification_jobs (email_identity_id)
  where status in ('pending', 'processing');

create index if not exists email_identity_contacts_contact_idx
  on tracker.email_identity_contacts (contact_id, email_identity_id);

create index if not exists email_identities_due_idx
  on tracker.email_identities (email_next_verification_at, id)
  where email_next_verification_at is not null;

alter table tracker.email_verification_jobs
  alter column email_identity_id set not null;

alter table tracker.email_verification_attempts
  alter column email_identity_id set not null;

create or replace view tracker_read.v_email_verification_jobs as
select id, contact_id, email_snapshot, reason, status, attempts, available_at,
       claimed_by, lease_until, last_error, created_at, started_at, completed_at,
       email_identity_id
from tracker.email_verification_jobs;

create or replace view tracker_read.v_email_verification_attempts as
select id, job_id, contact_id, email_snapshot, provider, provider_status,
       verification_mode, overall_score, is_safe_to_send, is_valid_syntax,
       is_disposable, is_role_account, can_connect_smtp, has_inbox_full,
       is_catch_all, is_deliverable, is_disabled, is_spamtrap, is_free_email,
       mx_accepts_mail, mx_records, raw_result, checked_at, email_identity_id
from tracker.email_verification_attempts;

create or replace function tracker.enqueue_contact_email_verification(
  p_contact_id uuid,
  p_reason text default 'new_contact'
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  contact_row tracker.discovery_contacts;
  identity_row tracker.email_identities;
  job_id uuid;
begin
  if p_reason not in ('new_contact', 'email_changed', 'monthly_due', 'admin_forced') then
    raise exception 'Unsupported email verification reason' using errcode = '22023';
  end if;
  select * into contact_row from tracker.discovery_contacts where id = p_contact_id;
  if not found or nullif(trim(contact_row.email), '') is null then return null; end if;

  insert into tracker.email_identities (normalized_email)
  values (lower(trim(contact_row.email)))
  on conflict (normalized_email) do nothing;
  select * into identity_row
  from tracker.email_identities
  where normalized_email = lower(trim(contact_row.email))
  for update;

  insert into tracker.email_identity_contacts (email_identity_id, contact_id)
  values (identity_row.id, p_contact_id)
  on conflict (contact_id) do update set email_identity_id = excluded.email_identity_id, linked_at = now();

  if p_reason <> 'admin_forced' and exists (
    select 1 from tracker.email_verification_attempts attempt
    where attempt.email_identity_id = identity_row.id
  ) then
    return null;
  end if;

  select id into job_id
  from tracker.email_verification_jobs
  where email_identity_id = identity_row.id and status in ('pending', 'processing')
  order by created_at desc
  limit 1;
  if job_id is not null then return job_id; end if;

  insert into tracker.email_verification_jobs (contact_id, email_identity_id, email_snapshot, reason)
  values (p_contact_id, identity_row.id, lower(trim(contact_row.email)), p_reason)
  returning id into job_id;
  return job_id;
end;
$$;

create or replace function tracker.claim_contact_email_verification(
  p_worker_id text,
  p_lease_seconds integer default 180
)
returns setof tracker_read.v_email_verification_jobs
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if nullif(trim(p_worker_id), '') is null or p_lease_seconds not between 30 and 900 then
    raise exception 'Provide a worker id and lease between 30 and 900 seconds' using errcode = '22023';
  end if;
  return query
  with candidate as (
    select id from tracker.email_verification_jobs
    where status = 'pending' and available_at <= now()
    order by created_at, id for update skip locked limit 1
  ), claimed as (
    update tracker.email_verification_jobs job
    set status = 'processing', attempts = job.attempts + 1,
        claimed_by = trim(p_worker_id), lease_until = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(job.started_at, now()), last_error = null
    from candidate where job.id = candidate.id
    returning job.id, job.contact_id, job.email_snapshot, job.reason, job.status,
      job.attempts, job.available_at, job.claimed_by, job.lease_until,
      job.last_error, job.created_at, job.started_at, job.completed_at,
      job.email_identity_id
  ) select * from claimed;
end;
$$;

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
  identity_row tracker.email_identities;
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
  select * into identity_row from tracker.email_identities where id = job.email_identity_id for update;
  if not found or identity_row.normalized_email <> lower(trim(job.email_snapshot)) then
    raise exception 'Email identity changed while verification was in progress' using errcode = '22023';
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
    job_id, contact_id, email_identity_id, email_snapshot, provider_status, verification_mode,
    overall_score, is_safe_to_send, is_valid_syntax, is_disposable, is_role_account,
    can_connect_smtp, has_inbox_full, is_catch_all, is_deliverable, is_disabled,
    is_spamtrap, is_free_email, mx_accepts_mail, mx_records, raw_result
  ) values (
    job.id, job.contact_id, job.email_identity_id, job.email_snapshot, v_provider_status, 'power',
    nullif(p_result->>'overallScore', '')::numeric, (p_result->>'isSafeToSend')::boolean,
    (p_result->>'isValidSyntax')::boolean, (p_result->>'isDisposable')::boolean,
    (p_result->>'isRoleAccount')::boolean, (p_result->>'canConnectSmtp')::boolean,
    (p_result->>'hasInboxFull')::boolean, (p_result->>'isCatchAll')::boolean,
    (p_result->>'isDeliverable')::boolean, (p_result->>'isDisabled')::boolean,
    (p_result->>'isSpamtrap')::boolean, (p_result->>'isFreeEmail')::boolean,
    (p_result->>'mxAcceptsMail')::boolean, coalesce(p_result->'mxRecords', '[]'::jsonb),
    coalesce(p_result->'raw', normalized_result)
  );
  select policy.interval_days into v_interval_days
  from tracker.email_verification_policy policy
  where policy.provider_status = v_provider_status and policy.enabled and policy.automatic_reverify;
  update tracker.email_identities
  set email_verification_status = v_provider_status,
      email_verification_score = nullif(p_result->>'overallScore', '')::numeric,
      email_is_safe_to_send = (p_result->>'isSafeToSend')::boolean,
      email_verification_mode = 'power', email_verification_checked_at = now(),
      email_next_verification_at = case when v_interval_days is null then null else now() + make_interval(days => v_interval_days) end,
      updated_at = now()
  where id = job.email_identity_id;
  select * into identity_row
  from tracker.email_identities
  where id = job.email_identity_id;
  update tracker.discovery_contacts contact
  set email_verification_status = identity_row.email_verification_status,
      email_verification_score = identity_row.email_verification_score,
      email_is_safe_to_send = identity_row.email_is_safe_to_send,
      email_verification_mode = identity_row.email_verification_mode,
      email_verification_checked_at = identity_row.email_verification_checked_at,
      email_next_verification_at = identity_row.email_next_verification_at
  where exists (select 1 from tracker.email_identity_contacts link where link.contact_id = contact.id and link.email_identity_id = job.email_identity_id);
  update tracker.email_verification_jobs set status = 'completed', completed_at = now(), lease_until = null where id = job.id;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('contact', job.contact_id, 'reoon_email_verified', jsonb_build_object('jobId', job.id, 'emailIdentityId', job.email_identity_id, 'status', v_provider_status, 'mode', 'power', 'score', p_result->'overallScore'));
  return query select contact.* from tracker_read.v_discovery_contacts contact
  where exists (select 1 from tracker.email_identity_contacts link where link.contact_id = contact.id and link.email_identity_id = job.email_identity_id);
end;
$$;

create or replace function tracker.enqueue_contact_verifications_for_new_records()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if tg_op = 'UPDATE' and lower(trim(coalesce(old.email, ''))) is distinct from lower(trim(coalesce(new.email, ''))) then
    delete from tracker.email_identity_contacts where contact_id = new.id;
  end if;
  if nullif(trim(new.email), '') is not null then
    if tg_op = 'INSERT' then
      perform tracker.enqueue_contact_email_verification(new.id, 'new_contact');
    elsif lower(trim(coalesce(old.email, ''))) is distinct from lower(trim(coalesce(new.email, ''))) then
      perform tracker.enqueue_contact_email_verification(new.id, 'email_changed');
    end if;
  end if;
  return new;
end;
$$;

update tracker.routine_catalog
set source_migration = '041_shared_email_identity_lock.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name in ('enqueue_contact_email_verification', 'claim_contact_email_verification', 'record_contact_email_verification', 'enqueue_contact_verifications_for_new_records')
  and routine_kind = 'function';

commit;
