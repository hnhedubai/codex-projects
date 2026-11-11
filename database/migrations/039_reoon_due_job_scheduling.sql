begin;

create index if not exists discovery_contacts_email_verification_due_idx
  on tracker.discovery_contacts (email_next_verification_at, id)
  where email_next_verification_at is not null;

create or replace function tracker.enqueue_due_contact_email_verifications(
  p_limit integer default 25
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  contact_row record;
  enqueued integer := 0;
begin
  if p_limit not between 1 and 500 then
    raise exception 'Due verification batch must be between 1 and 500' using errcode = '22023';
  end if;

  for contact_row in
    select contact.id
    from tracker.discovery_contacts contact
    join tracker.email_verification_policy policy
      on policy.provider_status = contact.email_verification_status
     and policy.enabled and policy.automatic_reverify
    where contact.email_verification_status is not null
      and contact.email_next_verification_at <= now()
      and nullif(trim(contact.email), '') is not null
      and not exists (
        select 1 from tracker.email_verification_jobs job
        where job.contact_id = contact.id
          and lower(trim(job.email_snapshot)) = lower(trim(contact.email))
          and job.status in ('pending', 'processing')
      )
    order by contact.email_next_verification_at, contact.id
    limit p_limit
  loop
    if tracker.enqueue_contact_email_verification(contact_row.id, 'monthly_due') is not null then
      enqueued := enqueued + 1;
    end if;
  end loop;
  return enqueued;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration
)
values (
  'tracker', 'enqueue_due_contact_email_verifications', 'p_limit integer', 'function',
  'Create bounded monthly Reoon Power Mode jobs from the configured verification policy.',
  'write', '039_reoon_due_job_scheduling.sql'
)
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation, source_migration = excluded.source_migration, updated_at = now();

commit;

