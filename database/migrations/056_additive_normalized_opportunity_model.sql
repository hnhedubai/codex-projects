begin;

/*
  Additive normalized model.

  This migration deliberately does not alter tracker.cprofiles or
  tracker.discovery_contacts. They remain the company/account and contact
  profile masters. The tables below store dated company facts, company-to-
  company observations, and intent-scoped candidate state around those
  masters.
*/

create table if not exists tracker.cprofile_date_facts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  date_type text not null check (date_type in (
    'established', 'incorporated', 'renamed', 'dissolved', 'other'
  )),
  event_year smallint not null check (event_year between 1000 and 2100),
  event_month smallint check (event_month between 1 and 12),
  event_day smallint check (event_day between 1 and 31),
  date_precision text not null default 'year' check (date_precision in ('year', 'month', 'day')),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null check (length(trim(source_url)) > 0),
  evidence text not null check (length(trim(evidence)) > 0),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  status text not null default 'observed' check (status in (
    'observed', 'verified', 'rejected', 'needs_human_review'
  )),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (date_precision = 'year' and event_month is null and event_day is null)
    or (date_precision = 'month' and event_month is not null and event_day is null)
    or (date_precision = 'day' and event_month is not null and event_day is not null)
  ),
  check (event_day is null or event_month is not null),
  check (
    event_day is null
    or make_date(event_year::integer, event_month::integer, event_day::integer) is not null
  )
);

create unique index if not exists cprofile_date_facts_observation_identity_idx
  on tracker.cprofile_date_facts (
    company_id,
    date_type,
    event_year,
    coalesce(event_month, 0),
    coalesce(event_day, 0),
    coalesce(source_snapshot_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists cprofile_date_facts_company_type_idx
  on tracker.cprofile_date_facts (company_id, date_type, event_year desc);

create table if not exists tracker.cprofile_relationships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  related_company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'parent', 'subsidiary', 'joint_venture', 'partner', 'supplier',
    'customer', 'operator', 'agent', 'broker', 'investor', 'acquirer',
    'financier', 'other'
  )),
  relationship_status text not null default 'observed' check (relationship_status in (
    'observed', 'verified', 'rejected', 'needs_human_review'
  )),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null check (length(trim(source_url)) > 0),
  evidence text not null check (length(trim(evidence)) > 0),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  valid_from date,
  valid_to date,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (company_id <> related_company_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists cprofile_relationships_observation_identity_idx
  on tracker.cprofile_relationships (
    company_id,
    related_company_id,
    relationship_type,
    coalesce(source_snapshot_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists cprofile_relationships_related_company_idx
  on tracker.cprofile_relationships (related_company_id, relationship_type);

create table if not exists tracker.intent_company_candidates (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references tracker.intent_requests(id) on delete cascade,
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  candidate_role text not null check (candidate_role in (
    'buyer', 'offtaker', 'seller', 'supplier', 'investor', 'developer',
    'operator', 'authority', 'partner', 'other'
  )),
  candidate_status text not null default 'discovered' check (candidate_status in (
    'discovered', 'under_review', 'qualified', 'rejected', 'archived'
  )),
  engagement_status text not null default 'unknown' check (engagement_status in (
    'unknown', 'seeking', 'expressed_interest', 'tendering', 'negotiating',
    'term_sheet', 'agreement_signed', 'not_seeking', 'not_applicable'
  )),
  created_by text not null check (length(trim(created_by)) > 0),
  first_seen_at timestamptz not null default now(),
  last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intent_id, company_id, candidate_role)
);

create index if not exists intent_company_candidates_intent_status_idx
  on tracker.intent_company_candidates (intent_id, candidate_status, engagement_status, updated_at desc);

create index if not exists intent_company_candidates_company_idx
  on tracker.intent_company_candidates (company_id, updated_at desc);

create table if not exists tracker.intent_company_candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references tracker.intent_company_candidates(id) on delete cascade,
  discovery_run_id uuid references tracker.discovery_runs(id) on delete set null,
  discovery_evidence_id uuid references tracker.discovery_evidence(id) on delete set null,
  discovery_source_fetch_id uuid references tracker.discovery_source_fetches(id) on delete set null,
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  provider text not null check (provider in ('exa', 'firecrawl', 'official_source', 'analyst')),
  source_url text not null check (length(trim(source_url)) > 0),
  source_title text,
  source_published_at timestamptz,
  evidence text not null check (length(trim(evidence)) > 0),
  observed_role text check (observed_role is null or observed_role in (
    'buyer', 'offtaker', 'seller', 'supplier', 'investor', 'developer',
    'operator', 'authority', 'partner', 'other'
  )),
  observed_engagement_status text check (observed_engagement_status is null or observed_engagement_status in (
    'unknown', 'seeking', 'expressed_interest', 'tendering', 'negotiating',
    'term_sheet', 'agreement_signed', 'not_seeking', 'not_applicable'
  )),
  review_status text not null default 'observed' check (review_status in (
    'observed', 'verified', 'rejected', 'needs_human_review'
  )),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  raw_payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  evidence_hash text generated always as (
    md5(coalesce(provider, '') || '|' || source_url || '|' || evidence)
  ) stored,
  unique (candidate_id, evidence_hash)
);

create index if not exists intent_company_candidate_evidence_candidate_idx
  on tracker.intent_company_candidate_evidence (candidate_id, observed_at desc, created_at desc);

create index if not exists intent_company_candidate_evidence_provider_idx
  on tracker.intent_company_candidate_evidence (provider, source_url);

create or replace view tracker_read.v_cprofile_date_facts as
select
  fact.id,
  fact.company_id,
  company.canonical_name as company_name,
  fact.date_type,
  fact.event_year,
  fact.event_month,
  fact.event_day,
  fact.date_precision,
  fact.source_snapshot_id,
  fact.source_url,
  fact.evidence,
  fact.confidence,
  fact.status,
  fact.observed_at,
  fact.created_at,
  fact.updated_at
from tracker.cprofile_date_facts fact
join tracker.cprofiles company on company.id = fact.company_id;

create or replace view tracker_read.v_cprofile_establishment_years as
select distinct on (fact.company_id)
  fact.company_id,
  company.canonical_name as company_name,
  fact.event_year as established_year,
  fact.date_precision,
  fact.source_snapshot_id,
  fact.source_url,
  fact.evidence,
  fact.confidence,
  fact.status,
  fact.observed_at,
  fact.updated_at
from tracker.cprofile_date_facts fact
join tracker.cprofiles company on company.id = fact.company_id
where fact.date_type = 'established'
  and fact.status <> 'rejected'
order by fact.company_id,
         (fact.status = 'verified') desc,
         fact.observed_at desc,
         fact.updated_at desc,
         fact.id;

create or replace view tracker_read.v_cprofile_relationships as
select
  relationship.id,
  relationship.company_id,
  company.canonical_name as company_name,
  relationship.related_company_id,
  related_company.canonical_name as related_company_name,
  relationship.relationship_type,
  relationship.relationship_status,
  relationship.source_snapshot_id,
  relationship.source_url,
  relationship.evidence,
  relationship.confidence,
  relationship.valid_from,
  relationship.valid_to,
  relationship.observed_at,
  relationship.created_at,
  relationship.updated_at
from tracker.cprofile_relationships relationship
join tracker.cprofiles company on company.id = relationship.company_id
join tracker.cprofiles related_company on related_company.id = relationship.related_company_id;

create or replace view tracker_read.v_intent_company_candidate_evidence as
select
  evidence.id,
  evidence.candidate_id,
  evidence.provider,
  evidence.source_url,
  evidence.source_title,
  evidence.source_published_at,
  evidence.evidence,
  evidence.observed_role,
  evidence.observed_engagement_status,
  evidence.review_status,
  evidence.confidence,
  evidence.raw_payload,
  evidence.discovery_run_id,
  evidence.discovery_evidence_id,
  evidence.discovery_source_fetch_id,
  evidence.source_snapshot_id,
  evidence.observed_at,
  evidence.created_at
from tracker.intent_company_candidate_evidence evidence;

create or replace view tracker_read.v_intent_company_candidates as
select
  candidate.id,
  candidate.intent_id,
  intent.reference_code as intent_reference_code,
  intent.research_project_id,
  intent.goal as intent_goal,
  intent.opportunity_kind,
  intent.geography,
  intent.sector,
  candidate.company_id,
  company.canonical_name as company_name,
  company.primary_domain,
  candidate.candidate_role,
  candidate.candidate_status,
  candidate.engagement_status,
  candidate.created_by,
  candidate.first_seen_at,
  candidate.last_observed_at,
  (select count(*)::bigint
   from tracker.intent_company_candidate_evidence evidence
   where evidence.candidate_id = candidate.id) as evidence_count,
  latest_evidence.id as latest_evidence_id,
  latest_evidence.provider as latest_evidence_provider,
  latest_evidence.source_url as latest_evidence_url,
  latest_evidence.evidence as latest_evidence,
  latest_evidence.review_status as latest_evidence_status,
  latest_evidence.confidence as latest_evidence_confidence,
  candidate.created_at,
  candidate.updated_at
from tracker.intent_company_candidates candidate
join tracker.intent_requests intent on intent.id = candidate.intent_id
join tracker.cprofiles company on company.id = candidate.company_id
left join lateral (
  select evidence.id, evidence.provider, evidence.source_url, evidence.evidence,
         evidence.review_status, evidence.confidence
  from tracker.intent_company_candidate_evidence evidence
  where evidence.candidate_id = candidate.id
  order by evidence.observed_at desc, evidence.created_at desc, evidence.id
  limit 1
) latest_evidence on true;

create or replace function tracker.record_cprofile_date_observation(
  p_company_id uuid,
  p_date_type text,
  p_event_year smallint,
  p_event_month smallint default null,
  p_event_day smallint default null,
  p_date_precision text default 'year',
  p_source_snapshot_id uuid default null,
  p_source_url text default null,
  p_evidence text default null,
  p_confidence numeric default 0.5,
  p_status text default 'observed'
)
returns setof tracker_read.v_cprofile_date_facts
language plpgsql
security invoker
set search_path = pg_catalog, tracker, tracker_read
as $$
declare
  v_id uuid;
  v_date_type text := lower(trim(p_date_type));
  v_precision text := lower(trim(coalesce(p_date_precision, 'year')));
  v_status text := lower(trim(coalesce(p_status, 'observed')));
  v_source_url text := nullif(trim(p_source_url), '');
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile does not exist' using errcode = '22023';
  end if;
  if p_event_year is null or p_event_year < 1000 or p_event_year > extract(year from current_date)::integer + 1 then
    raise exception 'Company date year is outside the allowed range' using errcode = '22023';
  end if;
  if v_precision = 'year' and (p_event_month is not null or p_event_day is not null) then
    raise exception 'Year precision cannot include month or day' using errcode = '22023';
  end if;
  if v_precision = 'month' and (p_event_month is null or p_event_day is not null) then
    raise exception 'Month precision requires a month and no day' using errcode = '22023';
  end if;
  if v_precision = 'day' and (p_event_month is null or p_event_day is null) then
    raise exception 'Day precision requires both month and day' using errcode = '22023';
  end if;
  if p_event_day is not null and p_event_month is null then
    raise exception 'A day requires a month' using errcode = '22023';
  end if;
  if p_evidence is null or length(trim(p_evidence)) = 0 then
    raise exception 'Source evidence is required for a company date fact' using errcode = '22023';
  end if;
  if p_source_snapshot_id is not null then
    select source_url into v_source_url
    from tracker.cprofile_source_snapshots
    where id = p_source_snapshot_id and company_id = p_company_id;
    if not found then
      raise exception 'Source snapshot does not belong to the company' using errcode = '22023';
    end if;
  end if;
  if v_source_url is null then
    raise exception 'A source URL or company source snapshot is required' using errcode = '22023';
  end if;

  insert into tracker.cprofile_date_facts (
    company_id, date_type, event_year, event_month, event_day, date_precision,
    source_snapshot_id, source_url, evidence, confidence, status, observed_at, updated_at
  )
  values (
    p_company_id, v_date_type, p_event_year, p_event_month, p_event_day, v_precision,
    p_source_snapshot_id, v_source_url, trim(p_evidence), least(greatest(coalesce(p_confidence, 0.5), 0), 1),
    v_status, now(), now()
  )
  on conflict do update set
    source_url = excluded.source_url,
    evidence = excluded.evidence,
    confidence = greatest(tracker.cprofile_date_facts.confidence, excluded.confidence),
    status = case
      when tracker.cprofile_date_facts.status = 'verified'
        and excluded.status in ('observed', 'needs_human_review')
        then tracker.cprofile_date_facts.status
      else excluded.status
    end,
    observed_at = excluded.observed_at,
    updated_at = now()
  returning id into v_id;

  return query select * from tracker_read.v_cprofile_date_facts where id = v_id;
end;
$$;

create or replace function tracker.record_cprofile_relationship_observation(
  p_company_id uuid,
  p_related_company_id uuid,
  p_relationship_type text,
  p_source_snapshot_id uuid default null,
  p_source_url text default null,
  p_evidence text default null,
  p_confidence numeric default 0.5,
  p_relationship_status text default 'observed',
  p_valid_from date default null,
  p_valid_to date default null
)
returns setof tracker_read.v_cprofile_relationships
language plpgsql
security invoker
set search_path = pg_catalog, tracker, tracker_read
as $$
declare
  v_id uuid;
  v_relationship_type text := lower(trim(p_relationship_type));
  v_status text := lower(trim(coalesce(p_relationship_status, 'observed')));
  v_source_url text := nullif(trim(p_source_url), '');
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id)
     or not exists (select 1 from tracker.cprofiles where id = p_related_company_id) then
    raise exception 'Both company profiles must exist' using errcode = '22023';
  end if;
  if p_company_id = p_related_company_id then
    raise exception 'A company cannot relate to itself' using errcode = '22023';
  end if;
  if p_evidence is null or length(trim(p_evidence)) = 0 then
    raise exception 'Source evidence is required for a company relationship' using errcode = '22023';
  end if;
  if p_source_snapshot_id is not null then
    select source_url into v_source_url
    from tracker.cprofile_source_snapshots
    where id = p_source_snapshot_id
      and company_id in (p_company_id, p_related_company_id);
    if not found then
      raise exception 'Relationship source snapshot must belong to one of the companies' using errcode = '22023';
    end if;
  end if;
  if v_source_url is null then
    raise exception 'A source URL or company source snapshot is required' using errcode = '22023';
  end if;

  insert into tracker.cprofile_relationships (
    company_id, related_company_id, relationship_type, relationship_status,
    source_snapshot_id, source_url, evidence, confidence, valid_from, valid_to,
    observed_at, updated_at
  )
  values (
    p_company_id, p_related_company_id, v_relationship_type, v_status,
    p_source_snapshot_id, v_source_url, trim(p_evidence), least(greatest(coalesce(p_confidence, 0.5), 0), 1),
    p_valid_from, p_valid_to, now(), now()
  )
  on conflict do update set
    source_url = excluded.source_url,
    evidence = excluded.evidence,
    confidence = greatest(tracker.cprofile_relationships.confidence, excluded.confidence),
    relationship_status = case
      when tracker.cprofile_relationships.relationship_status = 'verified'
        and excluded.relationship_status in ('observed', 'needs_human_review')
        then tracker.cprofile_relationships.relationship_status
      else excluded.relationship_status
    end,
    valid_from = excluded.valid_from,
    valid_to = excluded.valid_to,
    observed_at = excluded.observed_at,
    updated_at = now()
  returning id into v_id;

  return query select * from tracker_read.v_cprofile_relationships where id = v_id;
end;
$$;

create or replace function tracker.create_intent_company_candidate(
  p_intent_id uuid,
  p_company_id uuid,
  p_candidate_role text,
  p_created_by text
)
returns setof tracker_read.v_intent_company_candidates
language plpgsql
security invoker
set search_path = pg_catalog, tracker, tracker_read
as $$
declare
  v_id uuid;
  v_role text := lower(trim(p_candidate_role));
begin
  if not exists (select 1 from tracker.intent_requests where id = p_intent_id and status = 'active') then
    raise exception 'Select an active research intent' using errcode = '22023';
  end if;
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile does not exist' using errcode = '22023';
  end if;
  if p_created_by is null or length(trim(p_created_by)) = 0 then
    raise exception 'A researcher is required to create a company candidate' using errcode = '22023';
  end if;

  insert into tracker.intent_company_candidates (
    intent_id, company_id, candidate_role, created_by, first_seen_at, last_observed_at, updated_at
  )
  values (p_intent_id, p_company_id, v_role, trim(p_created_by), now(), now(), now())
  on conflict (intent_id, company_id, candidate_role) do update set
    last_observed_at = now(),
    updated_at = now()
  returning id into v_id;

  return query select * from tracker_read.v_intent_company_candidates where id = v_id;
end;
$$;

create or replace function tracker.record_intent_company_candidate_evidence(
  p_candidate_id uuid,
  p_provider text,
  p_source_url text,
  p_evidence text,
  p_observed_role text default null,
  p_observed_engagement_status text default null,
  p_discovery_run_id uuid default null,
  p_discovery_evidence_id uuid default null,
  p_discovery_source_fetch_id uuid default null,
  p_source_snapshot_id uuid default null,
  p_source_title text default null,
  p_source_published_at timestamptz default null,
  p_review_status text default 'observed',
  p_confidence numeric default 0.5,
  p_raw_payload jsonb default '{}'::jsonb,
  p_observed_at timestamptz default null
)
returns setof tracker_read.v_intent_company_candidate_evidence
language plpgsql
security invoker
set search_path = pg_catalog, tracker, tracker_read
as $$
declare
  v_id uuid;
  v_provider text := lower(trim(p_provider));
  v_review_status text := lower(trim(coalesce(p_review_status, 'observed')));
  v_observed_at timestamptz := coalesce(p_observed_at, now());
  v_source_url text := nullif(trim(p_source_url), '');
  v_company_id uuid;
begin
  select company_id into v_company_id
  from tracker.intent_company_candidates
  where id = p_candidate_id;
  if not found then
    raise exception 'Intent company candidate does not exist' using errcode = '22023';
  end if;
  if p_evidence is null or length(trim(p_evidence)) = 0 or v_source_url is null then
    raise exception 'Source URL and evidence are required' using errcode = '22023';
  end if;
  if p_source_snapshot_id is not null then
    if not exists (
      select 1 from tracker.cprofile_source_snapshots
      where id = p_source_snapshot_id and company_id = v_company_id
    ) then
      raise exception 'Candidate source snapshot does not belong to the candidate company' using errcode = '22023';
    end if;
  end if;
  if p_discovery_evidence_id is not null and not exists (
    select 1 from tracker.discovery_evidence where id = p_discovery_evidence_id
  ) then
    raise exception 'Discovery evidence does not exist' using errcode = '22023';
  end if;
  if p_discovery_source_fetch_id is not null and not exists (
    select 1 from tracker.discovery_source_fetches where id = p_discovery_source_fetch_id
  ) then
    raise exception 'Discovery source fetch does not exist' using errcode = '22023';
  end if;
  if p_discovery_run_id is not null and not exists (
    select 1
    from tracker.discovery_runs discovery_run
    join tracker.intent_company_candidates candidate on candidate.id = p_candidate_id
    join tracker.intent_requests intent on intent.id = candidate.intent_id
    where discovery_run.id = p_discovery_run_id
      and discovery_run.research_project_id = intent.research_project_id
      and (discovery_run.intent_id is null or discovery_run.intent_id = candidate.intent_id)
  ) then
    raise exception 'Discovery run is outside the candidate intent scope' using errcode = '22023';
  end if;
  if p_discovery_evidence_id is not null and p_discovery_run_id is not null and not exists (
    select 1 from tracker.discovery_evidence evidence
    where evidence.id = p_discovery_evidence_id and evidence.run_id = p_discovery_run_id
  ) then
    raise exception 'Discovery evidence does not belong to the selected discovery run' using errcode = '22023';
  end if;
  if p_discovery_source_fetch_id is not null and p_discovery_run_id is not null and not exists (
    select 1 from tracker.discovery_source_fetches source_fetch
    where source_fetch.id = p_discovery_source_fetch_id and source_fetch.run_id = p_discovery_run_id
  ) then
    raise exception 'Discovery source fetch does not belong to the selected discovery run' using errcode = '22023';
  end if;

  insert into tracker.intent_company_candidate_evidence (
    candidate_id, discovery_run_id, discovery_evidence_id, discovery_source_fetch_id,
    source_snapshot_id, provider, source_url, source_title, source_published_at,
    evidence, observed_role, observed_engagement_status, review_status, confidence,
    raw_payload, observed_at
  )
  values (
    p_candidate_id, p_discovery_run_id, p_discovery_evidence_id, p_discovery_source_fetch_id,
    p_source_snapshot_id, v_provider, v_source_url, nullif(trim(p_source_title), ''), p_source_published_at,
    trim(p_evidence), nullif(lower(trim(p_observed_role)), ''), nullif(lower(trim(p_observed_engagement_status)), ''),
    v_review_status, least(greatest(coalesce(p_confidence, 0.5), 0), 1), coalesce(p_raw_payload, '{}'::jsonb), v_observed_at
  )
  on conflict (candidate_id, evidence_hash) do update set
    source_title = excluded.source_title,
    source_published_at = excluded.source_published_at,
    observed_role = excluded.observed_role,
    observed_engagement_status = excluded.observed_engagement_status,
    review_status = case
      when tracker.intent_company_candidate_evidence.review_status = 'verified'
        and excluded.review_status in ('observed', 'needs_human_review')
        then tracker.intent_company_candidate_evidence.review_status
      else excluded.review_status
    end,
    confidence = greatest(tracker.intent_company_candidate_evidence.confidence, excluded.confidence),
    raw_payload = excluded.raw_payload,
    observed_at = excluded.observed_at
  returning id into v_id;

  update tracker.intent_company_candidates
  set last_observed_at = greatest(coalesce(last_observed_at, v_observed_at), v_observed_at),
      updated_at = now()
  where id = p_candidate_id;

  return query select * from tracker_read.v_intent_company_candidate_evidence where id = v_id;
end;
$$;

create or replace function tracker.update_intent_company_candidate_status(
  p_candidate_id uuid,
  p_candidate_status text,
  p_engagement_status text,
  p_actor text,
  p_reason text default null
)
returns setof tracker_read.v_intent_company_candidates
language plpgsql
security invoker
set search_path = pg_catalog, tracker, tracker_read
as $$
declare
  v_before tracker.intent_company_candidates;
begin
  if p_actor is null or length(trim(p_actor)) = 0 then
    raise exception 'An actor is required to update a candidate status' using errcode = '22023';
  end if;
  select * into v_before from tracker.intent_company_candidates where id = p_candidate_id for update;
  if not found then
    raise exception 'Intent company candidate does not exist' using errcode = '22023';
  end if;

  update tracker.intent_company_candidates
  set candidate_status = lower(trim(p_candidate_status)),
      engagement_status = lower(trim(p_engagement_status)),
      updated_at = now()
  where id = p_candidate_id;

  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values (
    'intent_company_candidate',
    p_candidate_id,
    'status_changed',
    jsonb_build_object(
      'actor', trim(p_actor),
      'reason', nullif(trim(p_reason), ''),
      'before', jsonb_build_object('candidateStatus', v_before.candidate_status, 'engagementStatus', v_before.engagement_status),
      'after', jsonb_build_object('candidateStatus', lower(trim(p_candidate_status)), 'engagementStatus', lower(trim(p_engagement_status)))
    )
  );

  return query select * from tracker_read.v_intent_company_candidates where id = p_candidate_id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'record_cprofile_date_observation', 'p_company_id uuid, p_date_type text, p_event_year smallint, p_event_month smallint, p_event_day smallint, p_date_precision text, p_source_snapshot_id uuid, p_source_url text, p_evidence text, p_confidence numeric, p_status text', 'function', 'Record an evidence-backed company date such as establishment year without changing the company master.', 'write', '056_additive_normalized_opportunity_model.sql'),
  ('tracker', 'record_cprofile_relationship_observation', 'p_company_id uuid, p_related_company_id uuid, p_relationship_type text, p_source_snapshot_id uuid, p_source_url text, p_evidence text, p_confidence numeric, p_relationship_status text, p_valid_from date, p_valid_to date', 'function', 'Record an evidence-backed directed relationship between two existing company profiles.', 'write', '056_additive_normalized_opportunity_model.sql'),
  ('tracker', 'create_intent_company_candidate', 'p_intent_id uuid, p_company_id uuid, p_candidate_role text, p_created_by text', 'function', 'Create or refresh the intent-scoped link between a research intent and an existing company profile.', 'write', '056_additive_normalized_opportunity_model.sql'),
  ('tracker', 'record_intent_company_candidate_evidence', 'p_candidate_id uuid, p_provider text, p_source_url text, p_evidence text, p_observed_role text, p_observed_engagement_status text, p_discovery_run_id uuid, p_discovery_evidence_id uuid, p_discovery_source_fetch_id uuid, p_source_snapshot_id uuid, p_source_title text, p_source_published_at timestamp with time zone, p_review_status text, p_confidence numeric, p_raw_payload jsonb, p_observed_at timestamp with time zone', 'function', 'Attach deduplicated Exa, Firecrawl, official-source, or analyst evidence to an intent company candidate.', 'write', '056_additive_normalized_opportunity_model.sql'),
  ('tracker', 'update_intent_company_candidate_status', 'p_candidate_id uuid, p_candidate_status text, p_engagement_status text, p_actor text, p_reason text', 'function', 'Update candidate workflow status through an audited transition while preserving the company master.', 'write', '056_additive_normalized_opportunity_model.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose,
              data_operation = excluded.data_operation,
              source_migration = excluded.source_migration,
              updated_at = now();

commit;
