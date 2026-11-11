begin;

create table if not exists tracker.cprofile_firecrawl_task_metrics (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references tracker.cprofile_firecrawl_jobs(id) on delete cascade,
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  provider_started_at timestamptz,
  provider_completed_at timestamptz,
  db_write_started_at timestamptz,
  db_write_completed_at timestamptz,
  provider_latency_ms integer,
  db_write_latency_ms integer,
  total_latency_ms integer,
  result_status text not null check (result_status in ('completed', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists cprofile_firecrawl_metrics_created_idx
  on tracker.cprofile_firecrawl_task_metrics (created_at desc, id);
create index if not exists cprofile_firecrawl_metrics_company_idx
  on tracker.cprofile_firecrawl_task_metrics (company_id, created_at desc, id);

create or replace view tracker_read.v_cprofile_firecrawl_task_metrics as
select id, job_id, company_id, provider_started_at, provider_completed_at,
       db_write_started_at, db_write_completed_at, provider_latency_ms,
       db_write_latency_ms, total_latency_ms, result_status, error_message,
       metadata, created_at
from tracker.cprofile_firecrawl_task_metrics;

create or replace view tracker_read.v_cprofile_firecrawl_operational_summary as
select count(*)::integer as task_count,
       count(*) filter (where result_status = 'completed')::integer as completed_count,
       count(*) filter (where result_status = 'failed')::integer as failed_count,
       round(avg(provider_latency_ms))::integer as avg_provider_latency_ms,
       round(avg(db_write_latency_ms))::integer as avg_db_write_latency_ms,
       round(avg(total_latency_ms))::integer as avg_total_latency_ms,
       max(created_at) as last_task_at
from tracker.cprofile_firecrawl_task_metrics
where created_at >= now() - interval '24 hours';

create or replace function tracker.record_cprofile_firecrawl_task_metrics(
  p_job_id uuid,
  p_company_id uuid,
  p_provider_started_at timestamptz,
  p_provider_completed_at timestamptz,
  p_db_write_started_at timestamptz,
  p_db_write_completed_at timestamptz,
  p_result_status text,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns setof tracker_read.v_cprofile_firecrawl_task_metrics
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare saved tracker.cprofile_firecrawl_task_metrics;
begin
  if not exists (select 1 from tracker.cprofile_firecrawl_jobs where id = p_job_id and company_id = p_company_id) then
    raise exception 'Firecrawl job was not found for this company' using errcode = 'P0002';
  end if;
  insert into tracker.cprofile_firecrawl_task_metrics (
    job_id, company_id, provider_started_at, provider_completed_at,
    db_write_started_at, db_write_completed_at, provider_latency_ms,
    db_write_latency_ms, total_latency_ms, result_status, error_message, metadata
  ) values (
    p_job_id, p_company_id, p_provider_started_at, p_provider_completed_at,
    p_db_write_started_at, p_db_write_completed_at,
    case when p_provider_started_at is null or p_provider_completed_at is null then null else greatest(0, (extract(epoch from (p_provider_completed_at - p_provider_started_at)) * 1000)::integer) end,
    case when p_db_write_started_at is null or p_db_write_completed_at is null then null else greatest(0, (extract(epoch from (p_db_write_completed_at - p_db_write_started_at)) * 1000)::integer) end,
    case when p_provider_started_at is null or p_db_write_completed_at is null then null else greatest(0, (extract(epoch from (p_db_write_completed_at - p_provider_started_at)) * 1000)::integer) end,
    p_result_status, left(p_error_message, 1000), coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (job_id) do update set
    provider_started_at = excluded.provider_started_at,
    provider_completed_at = excluded.provider_completed_at,
    db_write_started_at = excluded.db_write_started_at,
    db_write_completed_at = excluded.db_write_completed_at,
    provider_latency_ms = excluded.provider_latency_ms,
    db_write_latency_ms = excluded.db_write_latency_ms,
    total_latency_ms = excluded.total_latency_ms,
    result_status = excluded.result_status,
    error_message = excluded.error_message,
    metadata = excluded.metadata
  returning * into saved;
  return query select * from tracker_read.v_cprofile_firecrawl_task_metrics where id = saved.id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'record_cprofile_firecrawl_task_metrics', 'p_job_id uuid, p_company_id uuid, p_provider_started_at timestamp with time zone, p_provider_completed_at timestamp with time zone, p_db_write_started_at timestamp with time zone, p_db_write_completed_at timestamp with time zone, p_result_status text, p_error_message text, p_metadata jsonb', 'function', 'Record provider and database-write timings for Firecrawl operational monitoring.', 'write', '051_firecrawl_operational_telemetry.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

commit;
