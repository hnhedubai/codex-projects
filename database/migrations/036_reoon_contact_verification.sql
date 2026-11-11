begin;

alter table tracker.discovery_contacts
  add column if not exists email_verification_status text,
  add column if not exists email_verification_score numeric(5,2),
  add column if not exists email_is_safe_to_send boolean,
  add column if not exists email_verification_mode text,
  add column if not exists email_verification_checked_at timestamptz,
  add column if not exists email_next_verification_at timestamptz;

create table if not exists tracker.email_verification_policy (
  provider_status text primary key,
  automatic_reverify boolean not null default false,
  interval_days integer,
  enabled boolean not null default true,
  constraint email_verification_policy_interval_check
    check (interval_days is null or interval_days between 1 and 3650)
);

insert into tracker.email_verification_policy (provider_status, automatic_reverify, interval_days)
values
  ('safe', true, 30),
  ('role_account', true, 30),
  ('catch_all', true, 30),
  ('inbox_full', true, 7),
  ('unknown', false, null),
  ('invalid', false, null),
  ('disabled', false, null),
  ('disposable', false, null),
  ('spamtrap', false, null)
on conflict (provider_status) do nothing;

create table if not exists tracker.email_verification_jobs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references tracker.discovery_contacts(id),
  email_snapshot text not null,
  reason text not null check (reason in ('new_contact', 'email_changed', 'monthly_due', 'admin_forced')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  claimed_by text,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists email_verification_jobs_active_idx
  on tracker.email_verification_jobs (contact_id, email_snapshot)
  where status in ('pending', 'processing');

create index if not exists email_verification_jobs_due_idx
  on tracker.email_verification_jobs (status, available_at, created_at)
  where status = 'pending';

create table if not exists tracker.email_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references tracker.email_verification_jobs(id),
  contact_id uuid not null references tracker.discovery_contacts(id),
  email_snapshot text not null,
  provider text not null default 'reoon' check (provider = 'reoon'),
  provider_status text not null check (provider_status in (
    'safe', 'invalid', 'disabled', 'disposable', 'inbox_full',
    'catch_all', 'role_account', 'spamtrap', 'unknown'
  )),
  verification_mode text not null check (verification_mode = 'power'),
  overall_score numeric(5,2),
  is_safe_to_send boolean,
  is_valid_syntax boolean,
  is_disposable boolean,
  is_role_account boolean,
  can_connect_smtp boolean,
  has_inbox_full boolean,
  is_catch_all boolean,
  is_deliverable boolean,
  is_disabled boolean,
  is_spamtrap boolean,
  is_free_email boolean,
  mx_accepts_mail boolean,
  mx_records jsonb not null default '[]'::jsonb,
  raw_result jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists email_verification_attempts_contact_idx
  on tracker.email_verification_attempts (contact_id, checked_at desc);

create or replace view tracker_read.v_email_verification_jobs as
select id, contact_id, email_snapshot, reason, status, attempts, available_at,
       claimed_by, lease_until, last_error, created_at, started_at, completed_at
from tracker.email_verification_jobs;

create or replace view tracker_read.v_email_verification_attempts as
select id, job_id, contact_id, email_snapshot, provider, provider_status,
       verification_mode, overall_score, is_safe_to_send, is_valid_syntax,
       is_disposable, is_role_account, can_connect_smtp, has_inbox_full,
       is_catch_all, is_deliverable, is_disabled, is_spamtrap, is_free_email,
       mx_accepts_mail, mx_records, raw_result, checked_at
from tracker.email_verification_attempts;

create or replace view tracker_read.v_discovery_contacts as
select id, run_id, result_index, researcher_id, contact_type, organisation,
       department, person_name, role, email, phone, website_url, linkedin_url,
       source_url, evidence_excerpt, confidence, verification_status, rank,
       created_at, email_verification_status, email_verification_score,
       email_is_safe_to_send, email_verification_mode,
       email_verification_checked_at, email_next_verification_at
from tracker.discovery_contacts;

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
  job_id uuid;
begin
  if p_reason not in ('new_contact', 'email_changed', 'monthly_due', 'admin_forced') then
    raise exception 'Unsupported email verification reason' using errcode = '22023';
  end if;

  select * into contact_row from tracker.discovery_contacts where id = p_contact_id;
  if not found or nullif(trim(contact_row.email), '') is null then return null; end if;

  if p_reason <> 'admin_forced' and exists (
    select 1 from tracker.email_verification_attempts attempt
    where attempt.contact_id = p_contact_id
      and lower(trim(attempt.email_snapshot)) = lower(trim(contact_row.email))
  ) then
    return null;
  end if;

  select id into job_id
  from tracker.email_verification_jobs
  where contact_id = p_contact_id
    and lower(trim(email_snapshot)) = lower(trim(contact_row.email))
    and status in ('pending', 'processing')
  order by created_at desc
  limit 1;
  if job_id is not null then return job_id; end if;

  insert into tracker.email_verification_jobs (contact_id, email_snapshot, reason)
  values (p_contact_id, lower(trim(contact_row.email)), p_reason)
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
    select id
    from tracker.email_verification_jobs
    where status = 'pending' and available_at <= now()
    order by created_at, id
    for update skip locked
    limit 1
  ), claimed as (
    update tracker.email_verification_jobs job
    set status = 'processing', attempts = job.attempts + 1,
        claimed_by = trim(p_worker_id), lease_until = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(job.started_at, now()), last_error = null
    from candidate
    where job.id = candidate.id
    returning job.*
  )
  select * from tracker_read.v_email_verification_jobs
  where id in (select id from claimed);
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
  contact_row tracker.discovery_contacts;
  provider_status text;
  v_interval_days integer;
  normalized_result jsonb;
begin
  select * into job from tracker.email_verification_jobs
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
    and (lease_until is null or lease_until > now());
  if not found then raise exception 'Verification job is not owned by this worker' using errcode = '22023'; end if;

  provider_status := lower(coalesce(p_result->>'status', ''));
  if provider_status not in ('safe', 'invalid', 'disabled', 'disposable', 'inbox_full', 'catch_all', 'role_account', 'spamtrap', 'unknown')
     or coalesce(p_result->>'verificationMode', '') <> 'power' then
    raise exception 'Reoon result must be a valid Power Mode response' using errcode = '22023';
  end if;

  select * into contact_row from tracker.discovery_contacts where id = job.contact_id;
  if not found or lower(trim(coalesce(contact_row.email, ''))) <> lower(trim(job.email_snapshot)) then
    raise exception 'Contact email changed while verification was in progress' using errcode = '22023';
  end if;

  normalized_result := jsonb_build_object(
    'email', p_result->>'email', 'status', provider_status,
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
    job.id, job.contact_id, job.email_snapshot, provider_status, 'power',
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
  where policy.provider_status = provider_status
    and policy.enabled and policy.automatic_reverify;

  update tracker.discovery_contacts
  set email_verification_status = provider_status,
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
    'jobId', job.id, 'status', provider_status, 'mode', 'power', 'score', p_result->'overallScore'
  ));

  return query select * from tracker_read.v_discovery_contacts where id = job.contact_id;
end;
$$;

create or replace function tracker.fail_contact_email_verification(
  p_job_id uuid,
  p_worker_id text,
  p_error text
)
returns setof tracker_read.v_email_verification_jobs
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  update tracker.email_verification_jobs
  set status = case when attempts >= 5 then 'failed' else 'pending' end,
      available_at = now() + make_interval(secs => least(3600, greatest(30, attempts * 60))),
      lease_until = null, claimed_by = null,
      last_error = left(coalesce(nullif(trim(p_error), ''), 'Provider verification failed.'), 500)
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id);
  if not found then raise exception 'Verification job is not owned by this worker' using errcode = '22023'; end if;
  return query select * from tracker_read.v_email_verification_jobs where id = p_job_id;
end;
$$;

create or replace function tracker.enqueue_contact_verifications_for_new_records()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
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

drop trigger if exists discovery_contact_email_verification on tracker.discovery_contacts;
create trigger discovery_contact_email_verification
after insert or update of email on tracker.discovery_contacts
for each row execute function tracker.enqueue_contact_verifications_for_new_records();

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration
)
values
  ('tracker', 'enqueue_contact_email_verification', 'p_contact_id uuid, p_reason text', 'function', 'Create one idempotent Reoon Power Mode job for a contact email.', 'write', '036_reoon_contact_verification.sql'),
  ('tracker', 'claim_contact_email_verification', 'p_worker_id text, p_lease_seconds integer', 'function', 'Claim one due email verification job with a short lease and skip locked concurrency.', 'write', '036_reoon_contact_verification.sql'),
  ('tracker', 'record_contact_email_verification', 'p_job_id uuid, p_worker_id text, p_result jsonb', 'function', 'Persist one normalized Reoon Power Mode result, update current contact state, schedule policy-based re-verification, and audit the outcome.', 'write', '036_reoon_contact_verification.sql'),
  ('tracker', 'fail_contact_email_verification', 'p_job_id uuid, p_worker_id text, p_error text', 'function', 'Record a sanitized provider failure and bounded retry state for a Reoon verification job.', 'write', '036_reoon_contact_verification.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

commit;
