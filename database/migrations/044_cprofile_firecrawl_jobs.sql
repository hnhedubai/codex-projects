begin;

create table if not exists tracker.cprofile_firecrawl_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  source_url text not null,
  canonical_url text not null,
  reason text not null default 'company_refresh' check (reason in ('new_company', 'company_refresh', 'activity_refresh', 'role_refresh', 'admin_forced')),
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

create unique index if not exists cprofile_firecrawl_jobs_active_idx
  on tracker.cprofile_firecrawl_jobs (company_id, canonical_url)
  where status in ('pending', 'processing');
create index if not exists cprofile_firecrawl_jobs_due_idx
  on tracker.cprofile_firecrawl_jobs (available_at, created_at, id)
  where status = 'pending';
create index if not exists cprofile_firecrawl_jobs_company_idx
  on tracker.cprofile_firecrawl_jobs (company_id, created_at desc, id);

create or replace view tracker_read.v_cprofile_firecrawl_jobs as
select id, company_id, source_url, canonical_url, reason, status, attempts,
       available_at, claimed_by, lease_until, last_error, created_at,
       started_at, completed_at
from tracker.cprofile_firecrawl_jobs;

create or replace function tracker.enqueue_cprofile_firecrawl(
  p_company_id uuid,
  p_source_url text,
  p_canonical_url text default null,
  p_reason text default 'company_refresh'
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  job_id uuid;
  canonical text := coalesce(nullif(trim(p_canonical_url), ''), trim(p_source_url));
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if nullif(trim(p_source_url), '') is null or nullif(canonical, '') is null then
    raise exception 'Source URL and canonical URL are required' using errcode = '22023';
  end if;
  if p_reason not in ('new_company', 'company_refresh', 'activity_refresh', 'role_refresh', 'admin_forced') then
    raise exception 'Unsupported Firecrawl job reason' using errcode = '22023';
  end if;
  insert into tracker.cprofile_firecrawl_jobs (company_id, source_url, canonical_url, reason)
  values (p_company_id, trim(p_source_url), canonical, p_reason)
  on conflict (company_id, canonical_url) where status in ('pending', 'processing') do nothing
  returning id into job_id;
  if job_id is null then
    select id into job_id
    from tracker.cprofile_firecrawl_jobs
    where company_id = p_company_id and canonical_url = canonical
      and status in ('pending', 'processing')
    order by created_at desc limit 1;
  end if;
  return job_id;
end;
$$;

create or replace function tracker.claim_cprofile_firecrawl_job(
  p_worker_id text,
  p_lease_seconds integer default 180
)
returns setof tracker_read.v_cprofile_firecrawl_jobs
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
    select id from tracker.cprofile_firecrawl_jobs
    where status = 'pending' and available_at <= now()
    order by created_at, id
    for update skip locked limit 1
  ), claimed as (
    update tracker.cprofile_firecrawl_jobs job
    set status = 'processing', attempts = job.attempts + 1,
        claimed_by = trim(p_worker_id), lease_until = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(job.started_at, now()), last_error = null
    from candidate where job.id = candidate.id
    returning job.*
  ) select * from claimed;
end;
$$;

create or replace function tracker.complete_cprofile_firecrawl_job(
  p_job_id uuid,
  p_worker_id text,
  p_source_url text,
  p_canonical_url text,
  p_provider_run_id text,
  p_content_hash text,
  p_markdown text,
  p_retrieved_at timestamptz default now(),
  p_status_code integer default 200,
  p_metadata jsonb default '{}'::jsonb
)
returns setof tracker_read.v_cprofile_source_snapshots
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  job tracker.cprofile_firecrawl_jobs;
  saved tracker_read.v_cprofile_source_snapshots;
begin
  select * into job
  from tracker.cprofile_firecrawl_jobs
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
    and (lease_until is null or lease_until > now());
  if not found then
    raise exception 'Firecrawl job is not owned by this worker' using errcode = '22023';
  end if;
  select * into saved
  from tracker.record_cprofile_firecrawl_snapshot(
    job.company_id, p_source_url, p_canonical_url, p_provider_run_id,
    p_content_hash, p_markdown, p_retrieved_at, p_status_code, p_metadata
  );
  update tracker.cprofile_firecrawl_jobs
  set status = 'completed', completed_at = now(), lease_until = null
  where id = job.id;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('organisation', job.company_id, 'cprofile_firecrawl_job_completed', jsonb_build_object('jobId', job.id, 'snapshotId', saved.id));
  return next saved;
end;
$$;

create or replace function tracker.fail_cprofile_firecrawl_job(
  p_job_id uuid,
  p_worker_id text,
  p_error text,
  p_retry_seconds integer default 300
)
returns setof tracker_read.v_cprofile_firecrawl_jobs
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  saved tracker.cprofile_firecrawl_jobs;
begin
  if p_retry_seconds not between 5 and 86400 then
    raise exception 'Retry delay must be between 5 and 86400 seconds' using errcode = '22023';
  end if;
  update tracker.cprofile_firecrawl_jobs
  set status = case when attempts < 3 then 'pending' else 'failed' end,
      available_at = case when attempts < 3 then now() + make_interval(secs => p_retry_seconds) else available_at end,
      claimed_by = null, lease_until = null,
      last_error = left(coalesce(p_error, 'Firecrawl provider failed.'), 1000)
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
  returning * into saved;
  if not found then
    raise exception 'Firecrawl job is not owned by this worker' using errcode = '22023';
  end if;
  return query select * from tracker_read.v_cprofile_firecrawl_jobs where id = saved.id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'enqueue_cprofile_firecrawl', 'p_company_id uuid, p_source_url text, p_canonical_url text, p_reason text', 'function', 'Create one active Firecrawl job per company and canonical source URL.', 'write', '044_cprofile_firecrawl_jobs.sql'),
  ('tracker', 'claim_cprofile_firecrawl_job', 'p_worker_id text, p_lease_seconds integer', 'function', 'Claim one due Firecrawl job with a short lease without holding a provider call inside the transaction.', 'write', '044_cprofile_firecrawl_jobs.sql'),
  ('tracker', 'complete_cprofile_firecrawl_job', 'p_job_id uuid, p_worker_id text, p_source_url text, p_canonical_url text, p_provider_run_id text, p_content_hash text, p_markdown text, p_retrieved_at timestamp with time zone, p_status_code integer, p_metadata jsonb', 'function', 'Persist an idempotent Firecrawl snapshot and complete the owned job.', 'write', '044_cprofile_firecrawl_jobs.sql'),
  ('tracker', 'fail_cprofile_firecrawl_job', 'p_job_id uuid, p_worker_id text, p_error text, p_retry_seconds integer', 'function', 'Record a bounded Firecrawl failure and schedule retry or terminal failure.', 'write', '044_cprofile_firecrawl_jobs.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation,
              source_migration = excluded.source_migration, updated_at = now();

commit;
