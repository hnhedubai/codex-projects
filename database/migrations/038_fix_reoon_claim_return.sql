begin;

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
    returning job.id, job.contact_id, job.email_snapshot, job.reason, job.status,
              job.attempts, job.available_at, job.claimed_by, job.lease_until,
              job.last_error, job.created_at, job.started_at, job.completed_at
  )
  select * from claimed;
end;
$$;

update tracker.routine_catalog
set source_migration = '038_fix_reoon_claim_return.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'claim_contact_email_verification'
  and identity_arguments = 'p_worker_id text, p_lease_seconds integer'
  and routine_kind = 'function';

commit;

