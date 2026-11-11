begin;

create table if not exists tracker.cprofile_external_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  link_type text not null check (link_type in ('website', 'linkedin', 'x', 'facebook', 'youtube', 'instagram', 'registry', 'government_profile', 'other')),
  url text not null check (length(trim(url)) between 1 and 2000),
  link_status text not null default 'officially_linked' check (link_status in ('observed', 'officially_linked', 'verified', 'rejected', 'needs_human_review')),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null,
  evidence_excerpt text not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, link_type, url)
);

create index if not exists cprofile_external_links_company_idx
  on tracker.cprofile_external_links (company_id, link_type, last_seen_at desc, id);

create or replace view tracker_read.v_cprofile_external_links as
select id, company_id, link_type, url, link_status, source_snapshot_id,
       source_url, evidence_excerpt, confidence, first_seen_at, last_seen_at,
       created_at, updated_at
from tracker.cprofile_external_links;

create or replace function tracker.record_cprofile_external_link(
  p_company_id uuid,
  p_link_type text,
  p_url text,
  p_link_status text,
  p_source_snapshot_id uuid,
  p_source_url text,
  p_evidence_excerpt text,
  p_confidence numeric
)
returns setof tracker_read.v_cprofile_external_links
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare saved tracker.cprofile_external_links;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then raise exception 'Company profile was not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_url), '') is null or nullif(trim(p_source_url), '') is null or nullif(trim(p_evidence_excerpt), '') is null then raise exception 'External link, source URL, and evidence excerpt are required' using errcode = '22023'; end if;
  insert into tracker.cprofile_external_links (company_id, link_type, url, link_status, source_snapshot_id, source_url, evidence_excerpt, confidence)
  values (p_company_id, p_link_type, trim(p_url), coalesce(p_link_status, 'officially_linked'), p_source_snapshot_id, trim(p_source_url), trim(p_evidence_excerpt), p_confidence)
  on conflict (company_id, link_type, url) do update set
    link_status = excluded.link_status, source_snapshot_id = excluded.source_snapshot_id,
    source_url = excluded.source_url, evidence_excerpt = excluded.evidence_excerpt,
    confidence = excluded.confidence, last_seen_at = now(), updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_external_links where id = saved.id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'record_cprofile_external_link', 'p_company_id uuid, p_link_type text, p_url text, p_link_status text, p_source_snapshot_id uuid, p_source_url text, p_evidence_excerpt text, p_confidence numeric', 'function', 'Record a company website-linked social, registry, or external account with provenance.', 'write', '048_cprofile_external_links.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation,
              source_migration = excluded.source_migration, updated_at = now();

commit;
