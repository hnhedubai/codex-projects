begin;

alter table tracker.cprofiles
  add column if not exists company_type text not null default 'Unknown';

do $$
begin
  alter table tracker.cprofiles
    add constraint cprofiles_company_type_check
    check (company_type in ('SOE', 'Private company', 'Public company', 'Government authority', 'Nonprofit', 'Joint venture', 'Subsidiary', 'Unknown'));
exception when duplicate_object then null;
end;
$$;

create index if not exists cprofiles_type_idx
  on tracker.cprofiles (company_type, updated_at desc, id);

create table if not exists tracker.sector_taxonomy (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references tracker.sector_taxonomy(id) on delete restrict,
  code text not null unique check (length(trim(code)) between 1 and 100),
  name text not null check (length(trim(name)) between 1 and 200),
  level text not null check (level in ('sector', 'sub_sector', 'business_line')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sector_taxonomy_parent_idx
  on tracker.sector_taxonomy (parent_id, level, name);

create table if not exists tracker.cprofile_business_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  taxonomy_id uuid not null references tracker.sector_taxonomy(id) on delete restrict,
  classification_type text not null default 'observed' check (classification_type in ('primary', 'secondary', 'historical', 'planned', 'claimed', 'observed', 'verified')),
  classification_status text not null default 'observed' check (classification_status in ('observed', 'verified', 'rejected', 'needs_human_review')),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  source_snapshot_id uuid references tracker.cprofile_source_snapshots(id) on delete set null,
  source_url text not null,
  evidence_excerpt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, taxonomy_id)
);

create index if not exists cprofile_business_lines_company_idx
  on tracker.cprofile_business_lines (company_id, classification_type, classification_status, last_seen_at desc);
create index if not exists cprofile_business_lines_taxonomy_idx
  on tracker.cprofile_business_lines (taxonomy_id, company_id);

create or replace view tracker_read.v_cprofiles as
select id, canonical_name, legal_name, display_name, company_status,
       legal_form, country_of_registration, website_url, primary_domain,
       linkedin_url, description, firecrawl_markdown, firecrawl_markdown_at,
       firecrawl_markdown_hash, firecrawl_source_url, identity_confidence,
       verification_status, first_seen_at, last_seen_at, created_at, updated_at,
       company_type
from tracker.cprofiles;

create or replace view tracker_read.v_sector_taxonomy as
select id, parent_id, code, name, level, description, active, created_at, updated_at
from tracker.sector_taxonomy;

create or replace view tracker_read.v_cprofile_business_lines as
select line.id, line.company_id, line.taxonomy_id, taxonomy.parent_id,
       taxonomy.code, taxonomy.name, taxonomy.level, line.classification_type,
       line.classification_status, line.confidence, line.source_snapshot_id,
       line.source_url, line.evidence_excerpt, line.first_seen_at,
       line.last_seen_at, line.created_at, line.updated_at
from tracker.cprofile_business_lines line
join tracker.sector_taxonomy taxonomy on taxonomy.id = line.taxonomy_id;

create or replace function tracker.set_cprofile_type(
  p_company_id uuid,
  p_company_type text
)
returns setof tracker_read.v_cprofiles
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  saved tracker.cprofiles;
begin
  update tracker.cprofiles
  set company_type = p_company_type, updated_at = now()
  where id = p_company_id
  returning * into saved;
  if not found then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  return query select * from tracker_read.v_cprofiles where id = saved.id;
end;
$$;

create or replace function tracker.record_cprofile_business_line(
  p_company_id uuid,
  p_taxonomy_id uuid,
  p_classification_type text,
  p_classification_status text,
  p_confidence numeric,
  p_source_snapshot_id uuid,
  p_source_url text,
  p_evidence_excerpt text
)
returns setof tracker_read.v_cprofile_business_lines
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  saved tracker.cprofile_business_lines;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from tracker.sector_taxonomy where id = p_taxonomy_id and active) then
    raise exception 'Active sector taxonomy node was not found' using errcode = 'P0002';
  end if;
  if nullif(trim(p_source_url), '') is null then
    raise exception 'Business-line source URL is required' using errcode = '22023';
  end if;
  insert into tracker.cprofile_business_lines (
    company_id, taxonomy_id, classification_type, classification_status,
    confidence, source_snapshot_id, source_url, evidence_excerpt,
    first_seen_at, last_seen_at, updated_at
  ) values (
    p_company_id, p_taxonomy_id, coalesce(p_classification_type, 'observed'),
    coalesce(p_classification_status, 'observed'), p_confidence,
    p_source_snapshot_id, trim(p_source_url), nullif(trim(p_evidence_excerpt), ''),
    now(), now(), now()
  )
  on conflict (company_id, taxonomy_id) do update set
    classification_type = excluded.classification_type,
    classification_status = excluded.classification_status,
    confidence = excluded.confidence,
    source_snapshot_id = excluded.source_snapshot_id,
    source_url = excluded.source_url,
    evidence_excerpt = excluded.evidence_excerpt,
    last_seen_at = now(),
    updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_business_lines where id = saved.id;
end;
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'set_cprofile_type', 'p_company_id uuid, p_company_type text', 'function', 'Set the independent company type such as SOE without mixing it with sector or role.', 'write', '046_company_type_sector_taxonomy.sql'),
  ('tracker', 'record_cprofile_business_line', 'p_company_id uuid, p_taxonomy_id uuid, p_classification_type text, p_classification_status text, p_confidence numeric, p_source_snapshot_id uuid, p_source_url text, p_evidence_excerpt text', 'function', 'Record a source-backed sector, sub-sector, or business-line classification for a company.', 'write', '046_company_type_sector_taxonomy.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation,
              source_migration = excluded.source_migration, updated_at = now();

commit;
