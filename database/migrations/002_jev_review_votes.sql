begin;

create table if not exists tracker.review_votes (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in (
    'contact', 'organisation', 'parcel', 'evidence', 'rejection', 'outreach_draft'
  )),
  subject_id uuid not null,
  checkpoint text not null check (checkpoint in (
    'contact_system_rejection',
    'contact_duplicate_resolution',
    'contact_outreach_readiness',
    'organisation_role_classification',
    'parcel_screening',
    'evidence_source_classification',
    'outreach_draft_review'
  )),
  reviewer text not null default 'jev' check (reviewer = 'jev'),
  outcome text not null check (outcome in (
    'confirm_rejection', 'reactivate', 'approve', 'reject', 'needs_human_review'
  )),
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  reason text,
  input_snapshot jsonb not null default '{}'::jsonb,
  external_review_reference text,
  created_at timestamptz not null default now()
);

create index if not exists review_votes_subject_idx
  on tracker.review_votes (subject_type, subject_id, created_at desc);

create or replace view tracker_read.v_review_votes as
select
  id,
  subject_type,
  subject_id,
  checkpoint,
  reviewer,
  outcome,
  confidence,
  reason,
  input_snapshot,
  external_review_reference,
  created_at
from tracker.review_votes;

create or replace function tracker.record_jev_vote(
  p_subject_type text,
  p_subject_id uuid,
  p_checkpoint text,
  p_outcome text,
  p_confidence numeric default null,
  p_reason text default null,
  p_input_snapshot jsonb default '{}'::jsonb,
  p_external_review_reference text default null
)
returns table (
  id uuid,
  subject_type text,
  subject_id uuid,
  checkpoint text,
  reviewer text,
  outcome text,
  confidence numeric,
  reason text,
  input_snapshot jsonb,
  external_review_reference text,
  created_at timestamptz
)
language plpgsql
as $$
declare
  created tracker.review_votes;
begin
  insert into tracker.review_votes (
    subject_type,
    subject_id,
    checkpoint,
    outcome,
    confidence,
    reason,
    input_snapshot,
    external_review_reference
  )
  values (
    p_subject_type,
    p_subject_id,
    p_checkpoint,
    p_outcome,
    p_confidence,
    p_reason,
    coalesce(p_input_snapshot, '{}'::jsonb),
    p_external_review_reference
  )
  returning * into created;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'review_vote',
    created.id,
    'jev_vote_recorded',
    jsonb_build_object('subjectType', created.subject_type, 'subjectId', created.subject_id,
      'checkpoint', created.checkpoint, 'outcome', created.outcome)
  );

  return query
  select * from tracker_read.v_review_votes where tracker_read.v_review_votes.id = created.id;
end;
$$;

commit;
