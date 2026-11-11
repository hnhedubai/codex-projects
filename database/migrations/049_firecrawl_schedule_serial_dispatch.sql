begin;

create table if not exists tracker.cprofile_firecrawl_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  source_url text not null,
  canonical_url text not null,
  cadence_days integer not null default 30 check (cadence_days between 1 and 365),
  enabled boolean not null default true,
  next_trigger_at timestamptz not null default now(),
  last_triggered_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, canonical_url)
);

create index if not exists cprofile_firecrawl_schedules_due_idx
  on tracker.cprofile_firecrawl_schedules (next_trigger_at, created_at, id)
  where enabled;

create or replace view tracker_read.v_cprofile_firecrawl_schedules as
select id, company_id, source_url, canonical_url, cadence_days, enabled,
       next_trigger_at, last_triggered_at, last_completed_at, last_error,
       created_at, updated_at
from tracker.cprofile_firecrawl_schedules;

create or replace function tracker.schedule_cprofile_firecrawl(
  p_company_id uuid,
  p_source_url text,
  p_canonical_url text default null,
  p_cadence_days integer default 30
)
returns setof tracker_read.v_cprofile_firecrawl_schedules
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare saved tracker.cprofile_firecrawl_schedules;
  canonical text := coalesce(nullif(trim(p_canonical_url), ''), trim(p_source_url));
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then raise exception 'Company profile was not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_source_url), '') is null or nullif(canonical, '') is null then raise exception 'Source and canonical URLs are required' using errcode = '22023'; end if;
  if p_cadence_days not between 1 and 365 then raise exception 'Cadence must be between 1 and 365 days' using errcode = '22023'; end if;
  insert into tracker.cprofile_firecrawl_schedules (company_id, source_url, canonical_url, cadence_days)
  values (p_company_id, trim(p_source_url), canonical, p_cadence_days)
  on conflict (company_id, canonical_url) do update set
    source_url = excluded.source_url, cadence_days = excluded.cadence_days,
    enabled = true, updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_firecrawl_schedules where id = saved.id;
end;
$$;

create or replace function tracker.enqueue_due_cprofile_firecrawl_jobs(
  p_limit integer default 1
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare schedule_row tracker.cprofile_firecrawl_schedules;
  created_count integer := 0;
  job_id uuid;
begin
  if p_limit not between 1 and 1 then raise exception 'Serial Firecrawl dispatch accepts a limit of one' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(45042, 3);
  for schedule_row in
    select * from tracker.cprofile_firecrawl_schedules
    where enabled and next_trigger_at <= now()
      and not exists (
        select 1 from tracker.cprofile_firecrawl_jobs job
        where job.company_id = cprofile_firecrawl_schedules.company_id
          and job.canonical_url = cprofile_firecrawl_schedules.canonical_url
          and job.status in ('pending', 'processing')
      )
    order by next_trigger_at, created_at, id
    for update skip locked
    limit 1
  loop
    select tracker.enqueue_cprofile_firecrawl(schedule_row.company_id, schedule_row.source_url, schedule_row.canonical_url, 'company_refresh') into job_id;
    if job_id is not null then
      update tracker.cprofile_firecrawl_schedules
      set next_trigger_at = now() + make_interval(days => schedule_row.cadence_days),
          last_triggered_at = now(), last_error = null, updated_at = now()
      where id = schedule_row.id;
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
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
  perform pg_advisory_xact_lock(45042, 2);
  update tracker.cprofile_firecrawl_jobs
  set status = 'pending', claimed_by = null, lease_until = null,
      available_at = now(), last_error = coalesce(last_error, 'Expired Firecrawl lease recovered.')
  where status = 'processing' and lease_until is not null and lease_until <= now();
  if (select count(*) from tracker.cprofile_firecrawl_jobs where status = 'processing' and lease_until > now()) >= 1 then
    return;
  end if;
  return query
  with candidate as (
    select id from tracker.cprofile_firecrawl_jobs
    where status = 'pending' and available_at <= now()
    order by created_at, id for update skip locked limit 1
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
  select * into job from tracker.cprofile_firecrawl_jobs
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
    and (lease_until is null or lease_until > now());
  if not found then raise exception 'Firecrawl job is not owned by this worker' using errcode = '22023'; end if;
  select * into saved from tracker.record_cprofile_firecrawl_snapshot(job.company_id, p_source_url, p_canonical_url, p_provider_run_id, p_content_hash, p_markdown, p_retrieved_at, p_status_code, p_metadata);
  update tracker.cprofile_firecrawl_jobs set status = 'completed', completed_at = now(), lease_until = null where id = job.id;
  update tracker.cprofile_firecrawl_schedules set last_completed_at = now(), last_error = null, updated_at = now()
  where company_id = job.company_id and canonical_url = p_canonical_url;
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
declare saved tracker.cprofile_firecrawl_jobs;
begin
  if p_retry_seconds not between 5 and 86400 then raise exception 'Retry delay must be between 5 and 86400 seconds' using errcode = '22023'; end if;
  update tracker.cprofile_firecrawl_jobs
  set status = case when attempts < 3 then 'pending' else 'failed' end,
      available_at = case when attempts < 3 then now() + make_interval(secs => p_retry_seconds) else available_at end,
      claimed_by = null, lease_until = null, last_error = left(coalesce(p_error, 'Firecrawl provider failed.'), 1000)
  where id = p_job_id and status = 'processing' and claimed_by = trim(p_worker_id)
  returning * into saved;
  if not found then raise exception 'Firecrawl job is not owned by this worker' using errcode = '22023'; end if;
  update tracker.cprofile_firecrawl_schedules set last_error = saved.last_error, updated_at = now()
  where company_id = saved.company_id and canonical_url = saved.canonical_url;
  return query select * from tracker_read.v_cprofile_firecrawl_jobs where id = saved.id;
end;
$$;

update tracker.routine_catalog set source_migration = '049_firecrawl_schedule_serial_dispatch.sql', updated_at = now()
where routine_schema = 'tracker' and routine_name in ('claim_cprofile_firecrawl_job', 'complete_cprofile_firecrawl_job', 'fail_cprofile_firecrawl_job') and routine_kind = 'function';

insert into tracker.routine_catalog (routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration)
values
  ('tracker', 'schedule_cprofile_firecrawl', 'p_company_id uuid, p_source_url text, p_canonical_url text, p_cadence_days integer', 'function', 'Create or update the single recurring Firecrawl schedule for one company source.', 'write', '049_firecrawl_schedule_serial_dispatch.sql'),
  ('tracker', 'enqueue_due_cprofile_firecrawl_jobs', 'p_limit integer', 'function', 'Convert one due Firecrawl schedule into one queued task without calling the provider.', 'maintenance', '049_firecrawl_schedule_serial_dispatch.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

commit;
