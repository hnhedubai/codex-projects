begin;

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

  -- Test-mode Firecrawl permits at most two provider calls at once. The
  -- advisory transaction lock protects only this short claim decision; it is
  -- released when this SQL call completes, before the provider request starts.
  perform pg_advisory_xact_lock(45042, 2);

  update tracker.cprofile_firecrawl_jobs
  set status = 'pending', claimed_by = null, lease_until = null,
      available_at = now(), last_error = coalesce(last_error, 'Expired Firecrawl lease recovered.')
  where status = 'processing' and lease_until is not null and lease_until <= now();

  if (select count(*) from tracker.cprofile_firecrawl_jobs where status = 'processing' and lease_until > now()) >= 2 then
    return;
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

update tracker.routine_catalog
set source_migration = '045_cap_firecrawl_test_concurrency.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'claim_cprofile_firecrawl_job'
  and routine_kind = 'function';

commit;
