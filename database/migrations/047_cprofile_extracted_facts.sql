begin;

create table if not exists tracker.cprofile_highlights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  highlight_type text not null check (highlight_type in ('business', 'role', 'project', 'market', 'contact', 'other')),
  highlight_text text not null check (length(trim(highlight_text)) between 1 and 1000),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null,
  evidence_excerpt text not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  status text not null default 'observed' check (status in ('observed', 'verified', 'rejected', 'needs_human_review')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cprofile_highlights_identity_idx
  on tracker.cprofile_highlights (company_id, highlight_type, lower(highlight_text));
create index if not exists cprofile_highlights_company_idx
  on tracker.cprofile_highlights (company_id, last_seen_at desc, id);

create table if not exists tracker.cprofile_people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  person_name text not null check (length(trim(person_name)) between 1 and 300),
  job_title text not null check (length(trim(job_title)) between 1 and 300),
  department text,
  email text,
  phone text,
  linkedin_url text,
  role_status text not null default 'observed' check (role_status in ('observed', 'verified', 'rejected', 'needs_human_review')),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null,
  evidence_excerpt text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cprofile_people_identity_idx
  on tracker.cprofile_people (company_id, lower(person_name), lower(job_title));
create index if not exists cprofile_people_company_idx
  on tracker.cprofile_people (company_id, last_seen_at desc, id);

create or replace view tracker_read.v_cprofile_highlights as
select id, company_id, highlight_type, highlight_text, source_snapshot_id,
       source_url, evidence_excerpt, confidence, status, first_seen_at,
       last_seen_at, created_at, updated_at
from tracker.cprofile_highlights;

create or replace view tracker_read.v_cprofile_people as
select id, company_id, person_name, job_title, department, email, phone,
       linkedin_url, role_status, confidence, source_snapshot_id, source_url,
       evidence_excerpt, first_seen_at, last_seen_at, created_at, updated_at
from tracker.cprofile_people;

create or replace function tracker.record_cprofile_highlight(
  p_company_id uuid,
  p_highlight_type text,
  p_highlight_text text,
  p_source_snapshot_id uuid,
  p_source_url text,
  p_evidence_excerpt text,
  p_confidence numeric,
  p_status text default 'observed'
)
returns setof tracker_read.v_cprofile_highlights
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare saved tracker.cprofile_highlights;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then raise exception 'Company profile was not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_highlight_text), '') is null or nullif(trim(p_source_url), '') is null or nullif(trim(p_evidence_excerpt), '') is null then raise exception 'Highlight text, source URL, and evidence excerpt are required' using errcode = '22023'; end if;
  insert into tracker.cprofile_highlights (company_id, highlight_type, highlight_text, source_snapshot_id, source_url, evidence_excerpt, confidence, status)
  values (p_company_id, p_highlight_type, trim(p_highlight_text), p_source_snapshot_id, trim(p_source_url), trim(p_evidence_excerpt), p_confidence, coalesce(p_status, 'observed'))
  on conflict (company_id, highlight_type, lower(highlight_text)) do update set
    source_snapshot_id = excluded.source_snapshot_id, source_url = excluded.source_url,
    evidence_excerpt = excluded.evidence_excerpt, confidence = excluded.confidence,
    status = excluded.status, last_seen_at = now(), updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_highlights where id = saved.id;
end;
$$;

create or replace function tracker.record_cprofile_person_observation(
  p_company_id uuid,
  p_person_name text,
  p_job_title text,
  p_department text,
  p_email text,
  p_phone text,
  p_linkedin_url text,
  p_source_snapshot_id uuid,
  p_source_url text,
  p_evidence_excerpt text,
  p_confidence numeric,
  p_role_status text default 'observed'
)
returns setof tracker_read.v_cprofile_people
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare saved tracker.cprofile_people;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then raise exception 'Company profile was not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_person_name), '') is null or nullif(trim(p_job_title), '') is null or nullif(trim(p_source_url), '') is null or nullif(trim(p_evidence_excerpt), '') is null then raise exception 'Named employee, job title, source URL, and evidence excerpt are required' using errcode = '22023'; end if;
  insert into tracker.cprofile_people (company_id, person_name, job_title, department, email, phone, linkedin_url, role_status, confidence, source_snapshot_id, source_url, evidence_excerpt)
  values (p_company_id, trim(p_person_name), trim(p_job_title), nullif(trim(p_department), ''), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_linkedin_url), ''), coalesce(p_role_status, 'observed'), p_confidence, p_source_snapshot_id, trim(p_source_url), trim(p_evidence_excerpt))
  on conflict (company_id, lower(person_name), lower(job_title)) do update set
    department = excluded.department, email = excluded.email, phone = excluded.phone,
    linkedin_url = excluded.linkedin_url, role_status = excluded.role_status,
    confidence = excluded.confidence, source_snapshot_id = excluded.source_snapshot_id,
    source_url = excluded.source_url, evidence_excerpt = excluded.evidence_excerpt,
    last_seen_at = now(), updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_people where id = saved.id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'record_cprofile_highlight', 'p_company_id uuid, p_highlight_type text, p_highlight_text text, p_source_snapshot_id uuid, p_source_url text, p_evidence_excerpt text, p_confidence numeric, p_status text', 'function', 'Upsert an evidence-linked company highlight derived from an official source snapshot.', 'write', '047_cprofile_extracted_facts.sql'),
  ('tracker', 'record_cprofile_person_observation', 'p_company_id uuid, p_person_name text, p_job_title text, p_department text, p_email text, p_phone text, p_linkedin_url text, p_source_snapshot_id uuid, p_source_url text, p_evidence_excerpt text, p_confidence numeric, p_role_status text', 'function', 'Upsert a named employee and explicitly stated job role with source evidence.', 'write', '047_cprofile_extracted_facts.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation,
              source_migration = excluded.source_migration, updated_at = now();

commit;
