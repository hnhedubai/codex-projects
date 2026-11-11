begin;

create table if not exists tracker.cprofiles (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (length(trim(canonical_name)) between 1 and 300),
  legal_name text,
  display_name text,
  company_status text not null default 'unknown' check (company_status in ('active', 'inactive', 'dissolved', 'unknown')),
  legal_form text,
  country_of_registration char(2) check (country_of_registration is null or country_of_registration = upper(country_of_registration)),
  website_url text,
  primary_domain text,
  linkedin_url text,
  description text,
  firecrawl_markdown text,
  firecrawl_markdown_at timestamptz,
  firecrawl_markdown_hash text,
  firecrawl_source_url text,
  identity_confidence numeric(5,4) check (identity_confidence is null or identity_confidence between 0 and 1),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'observed', 'verified', 'rejected', 'needs_human_review')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cprofiles_name_idx on tracker.cprofiles (lower(canonical_name));
create index if not exists cprofiles_domain_idx on tracker.cprofiles (lower(primary_domain)) where primary_domain is not null;
create index if not exists cprofiles_updated_idx on tracker.cprofiles (updated_at desc, id);

create table if not exists tracker.cprofile_names (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 300),
  name_type text not null check (name_type in ('legal', 'trading', 'former', 'alias', 'translated')),
  source_url text,
  evidence_excerpt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, name, name_type)
);

create table if not exists tracker.cprofile_identifiers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  identifier_type text not null check (identifier_type in ('registration', 'tax', 'lei', 'duns', 'external', 'other')),
  identifier_value text not null check (length(trim(identifier_value)) between 1 and 300),
  issuing_authority text,
  country_iso2 char(2) check (country_iso2 is null or country_iso2 = upper(country_iso2)),
  status text not null default 'observed' check (status in ('observed', 'verified', 'rejected')),
  source_url text,
  evidence_excerpt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (identifier_type, identifier_value)
);

create table if not exists tracker.cprofile_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  address_type text not null check (address_type in ('registered', 'operating', 'billing', 'other')),
  address_text text not null,
  country_iso2 char(2) check (country_iso2 is null or country_iso2 = upper(country_iso2)),
  city text,
  source_url text,
  evidence_excerpt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists tracker.cprofile_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('manufacturing', 'trading', 'logistics', 'investment', 'development', 'operations', 'advisory', 'government', 'utility', 'other')),
  activity_name text not null check (length(trim(activity_name)) between 1 and 300),
  product_or_service text,
  sector text,
  geography text,
  activity_status text not null default 'unknown' check (activity_status in ('active', 'historical', 'planned', 'unknown')),
  role_context text not null default 'unclear' check (role_context in ('own_account', 'intermediary', 'agent', 'unclear')),
  description text,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  source_url text not null,
  evidence_excerpt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cprofile_activities_observation_idx
  on tracker.cprofile_activities (company_id, lower(activity_name), source_url);
create index if not exists cprofile_activities_company_idx
  on tracker.cprofile_activities (company_id, last_seen_at desc, id);

create table if not exists tracker.cprofile_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  role_type text not null check (role_type in ('buyer', 'seller', 'investor', 'developer', 'landowner', 'operator', 'supplier', 'offtaker', 'authority', 'utility', 'logistics_provider', 'adviser', 'broker', 'epc_contractor', 'financier', 'manufacturer', 'other')),
  scope_type text not null default 'global' check (scope_type in ('global', 'project', 'intent', 'transaction')),
  scope_id uuid,
  role_status text not null default 'observed' check (role_status in ('claimed', 'observed', 'verified', 'rejected', 'needs_human_review')),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  source_url text not null,
  evidence_excerpt text,
  valid_from date,
  valid_to date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope_type = 'global' and scope_id is null) or (scope_type <> 'global' and scope_id is not null)),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists cprofile_roles_scope_idx
  on tracker.cprofile_roles (company_id, role_type, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists cprofile_roles_company_idx
  on tracker.cprofile_roles (company_id, role_status, last_seen_at desc, id);

create table if not exists tracker.cprofile_contacts (
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  contact_id uuid not null references tracker.discovery_contacts(id) on delete cascade,
  relationship_type text not null default 'professional_contact' check (relationship_type in ('professional_contact', 'public_route', 'executive', 'procurement', 'sales', 'operations', 'other')),
  source_url text,
  evidence_excerpt text,
  linked_at timestamptz not null default now(),
  primary key (company_id, contact_id),
  unique (contact_id)
);

create table if not exists tracker.cprofile_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references tracker.cprofiles(id) on delete cascade,
  provider text not null check (provider in ('firecrawl', 'exa', 'official_source', 'analyst')),
  source_url text not null,
  canonical_url text not null,
  provider_run_id text,
  content_hash text not null,
  markdown text not null default '',
  retrieved_at timestamptz not null default now(),
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, canonical_url, content_hash)
);

create index if not exists cprofile_source_snapshots_company_idx
  on tracker.cprofile_source_snapshots (company_id, retrieved_at desc, id);
create index if not exists cprofile_source_snapshots_hash_idx
  on tracker.cprofile_source_snapshots (content_hash);

create or replace view tracker_read.v_cprofiles as
select id, canonical_name, legal_name, display_name, company_status, legal_form,
       country_of_registration, website_url, primary_domain, linkedin_url,
       description, firecrawl_markdown, firecrawl_markdown_at,
       firecrawl_markdown_hash, firecrawl_source_url, identity_confidence,
       verification_status, first_seen_at, last_seen_at, created_at, updated_at
from tracker.cprofiles;

create or replace view tracker_read.v_cprofile_activities as
select id, company_id, activity_type, activity_name, product_or_service, sector,
       geography, activity_status, role_context, description, confidence,
       source_url, evidence_excerpt, first_seen_at, last_seen_at, created_at,
       updated_at
from tracker.cprofile_activities;

create or replace view tracker_read.v_cprofile_roles as
select id, company_id, role_type, scope_type, scope_id, role_status, confidence,
       source_url, evidence_excerpt, valid_from, valid_to, first_seen_at,
       last_seen_at, created_at, updated_at
from tracker.cprofile_roles;

create or replace view tracker_read.v_cprofile_source_snapshots as
select id, company_id, provider, source_url, canonical_url, provider_run_id,
       content_hash, markdown, retrieved_at, status_code, metadata, created_at
from tracker.cprofile_source_snapshots;

create or replace function tracker.create_cprofile(
  p_canonical_name text,
  p_legal_name text default null,
  p_display_name text default null,
  p_country_of_registration char(2) default null,
  p_website_url text default null,
  p_primary_domain text default null,
  p_actor text default 'system'
)
returns setof tracker_read.v_cprofiles
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  created tracker.cprofiles;
begin
  if nullif(trim(p_canonical_name), '') is null then
    raise exception 'A canonical company name is required' using errcode = '22023';
  end if;
  insert into tracker.cprofiles (
    canonical_name, legal_name, display_name, country_of_registration,
    website_url, primary_domain, first_seen_at, last_seen_at
  ) values (
    trim(p_canonical_name), nullif(trim(p_legal_name), ''),
    nullif(trim(p_display_name), ''), upper(nullif(trim(p_country_of_registration), '')),
    nullif(trim(p_website_url), ''), lower(nullif(trim(p_primary_domain), '')), now(), now()
  ) returning * into created;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('organisation', created.id, 'cprofile_created', jsonb_build_object('actor', p_actor, 'canonicalName', created.canonical_name));
  return query select * from tracker_read.v_cprofiles where id = created.id;
end;
$$;

create or replace function tracker.record_cprofile_activity_observation(
  p_company_id uuid,
  p_activity_type text,
  p_activity_name text,
  p_product_or_service text,
  p_sector text,
  p_geography text,
  p_activity_status text,
  p_role_context text,
  p_description text,
  p_confidence numeric,
  p_source_url text,
  p_evidence_excerpt text
)
returns setof tracker_read.v_cprofile_activities
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  saved tracker.cprofile_activities;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if nullif(trim(p_activity_name), '') is null or nullif(trim(p_source_url), '') is null then
    raise exception 'Activity name and source URL are required' using errcode = '22023';
  end if;
  insert into tracker.cprofile_activities (
    company_id, activity_type, activity_name, product_or_service, sector,
    geography, activity_status, role_context, description, confidence,
    source_url, evidence_excerpt, first_seen_at, last_seen_at, updated_at
  ) values (
    p_company_id, p_activity_type, trim(p_activity_name), nullif(trim(p_product_or_service), ''),
    nullif(trim(p_sector), ''), nullif(trim(p_geography), ''), coalesce(p_activity_status, 'unknown'),
    coalesce(p_role_context, 'unclear'), nullif(trim(p_description), ''), p_confidence,
    trim(p_source_url), nullif(trim(p_evidence_excerpt), ''), now(), now(), now()
  )
  on conflict (company_id, lower(activity_name), source_url) do update set
    activity_type = excluded.activity_type,
    product_or_service = excluded.product_or_service,
    sector = excluded.sector,
    geography = excluded.geography,
    activity_status = excluded.activity_status,
    role_context = excluded.role_context,
    description = excluded.description,
    confidence = excluded.confidence,
    evidence_excerpt = excluded.evidence_excerpt,
    last_seen_at = now(),
    updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_activities where id = saved.id;
end;
$$;

create or replace function tracker.record_cprofile_role_observation(
  p_company_id uuid,
  p_role_type text,
  p_scope_type text,
  p_scope_id uuid,
  p_role_status text,
  p_confidence numeric,
  p_source_url text,
  p_evidence_excerpt text,
  p_valid_from date default null,
  p_valid_to date default null
)
returns setof tracker_read.v_cprofile_roles
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  saved tracker.cprofile_roles;
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if nullif(trim(p_source_url), '') is null then
    raise exception 'Role source URL is required' using errcode = '22023';
  end if;
  insert into tracker.cprofile_roles (
    company_id, role_type, scope_type, scope_id, role_status, confidence,
    source_url, evidence_excerpt, valid_from, valid_to, first_seen_at,
    last_seen_at, updated_at
  ) values (
    p_company_id, p_role_type, coalesce(p_scope_type, 'global'), p_scope_id,
    coalesce(p_role_status, 'observed'), p_confidence, trim(p_source_url),
    nullif(trim(p_evidence_excerpt), ''), p_valid_from, p_valid_to, now(), now(), now()
  )
  on conflict (company_id, role_type, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update set
    role_status = excluded.role_status,
    confidence = excluded.confidence,
    source_url = excluded.source_url,
    evidence_excerpt = excluded.evidence_excerpt,
    valid_from = excluded.valid_from,
    valid_to = excluded.valid_to,
    last_seen_at = now(),
    updated_at = now()
  returning * into saved;
  return query select * from tracker_read.v_cprofile_roles where id = saved.id;
end;
$$;

create or replace function tracker.record_cprofile_firecrawl_snapshot(
  p_company_id uuid,
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
  snapshot_id uuid;
  effective_hash text;
  effective_retrieved_at timestamptz := coalesce(p_retrieved_at, now());
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if nullif(trim(p_source_url), '') is null or nullif(trim(p_canonical_url), '') is null then
    raise exception 'Source and canonical URLs are required' using errcode = '22023';
  end if;
  if p_markdown is null then
    raise exception 'Firecrawl Markdown is required' using errcode = '22023';
  end if;
  effective_hash := coalesce(nullif(trim(p_content_hash), ''), md5(p_markdown));
  insert into tracker.cprofile_source_snapshots (
    company_id, provider, source_url, canonical_url, provider_run_id,
    content_hash, markdown, retrieved_at, status_code, metadata
  ) values (
    p_company_id, 'firecrawl', trim(p_source_url), trim(p_canonical_url),
    nullif(trim(p_provider_run_id), ''), effective_hash, p_markdown,
    effective_retrieved_at, p_status_code, coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (company_id, canonical_url, content_hash) do nothing
  returning id into snapshot_id;
  if snapshot_id is null then
    select id into snapshot_id
    from tracker.cprofile_source_snapshots
    where company_id = p_company_id and canonical_url = trim(p_canonical_url)
      and content_hash = effective_hash;
  end if;
  update tracker.cprofiles
  set firecrawl_markdown = p_markdown,
      firecrawl_markdown_at = effective_retrieved_at,
      firecrawl_markdown_hash = effective_hash,
      firecrawl_source_url = trim(p_source_url),
      last_seen_at = greatest(last_seen_at, effective_retrieved_at),
      updated_at = now()
  where id = p_company_id
    and (firecrawl_markdown_at is null or firecrawl_markdown_at <= effective_retrieved_at);
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('organisation', p_company_id, 'cprofile_firecrawl_snapshot_recorded', jsonb_build_object(
    'snapshotId', snapshot_id, 'sourceUrl', p_source_url, 'canonicalUrl', p_canonical_url,
    'contentHash', effective_hash, 'retrievedAt', effective_retrieved_at
  ));
  return query select * from tracker_read.v_cprofile_source_snapshots where id = snapshot_id;
end;
$$;

create or replace function tracker.link_cprofile_contact(
  p_company_id uuid,
  p_contact_id uuid,
  p_relationship_type text default 'professional_contact',
  p_source_url text default null,
  p_evidence_excerpt text default null
)
returns table (company_id uuid, contact_id uuid, relationship_type text, source_url text, evidence_excerpt text, linked_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from tracker.discovery_contacts where id = p_contact_id) then
    raise exception 'Contact was not found' using errcode = 'P0002';
  end if;
  insert into tracker.cprofile_contacts (company_id, contact_id, relationship_type, source_url, evidence_excerpt)
  values (p_company_id, p_contact_id, coalesce(p_relationship_type, 'professional_contact'), nullif(trim(p_source_url), ''), nullif(trim(p_evidence_excerpt), ''))
  on conflict (contact_id) do update set
    company_id = excluded.company_id,
    relationship_type = excluded.relationship_type,
    source_url = excluded.source_url,
    evidence_excerpt = excluded.evidence_excerpt,
    linked_at = now();
  return query select link.company_id, link.contact_id, link.relationship_type, link.source_url, link.evidence_excerpt, link.linked_at
  from tracker.cprofile_contacts link where link.company_id = p_company_id and link.contact_id = p_contact_id;
end;
$$;

create or replace function tracker_read.list_cprofiles(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null
)
returns setof tracker_read.v_cprofiles
language sql
security invoker
set search_path = pg_catalog, tracker_read
as $$
  select company.*
  from tracker_read.v_cprofiles company
  where p_search is null or company.canonical_name ilike '%' || trim(p_search) || '%'
  order by company.updated_at desc, company.id
  limit least(greatest(coalesce(p_limit, 25), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

insert into tracker.routine_catalog (
  routine_schema, routine_name, identity_arguments, routine_kind,
  purpose, data_operation, source_migration
)
values
  ('tracker', 'create_cprofile', 'p_canonical_name text, p_legal_name text, p_display_name text, p_country_of_registration character, p_website_url text, p_primary_domain text, p_actor text', 'function', 'Create a canonical company profile through controlled auditable DML.', 'write', '042_cprofile_company_schema.sql'),
  ('tracker', 'record_cprofile_activity_observation', 'p_company_id uuid, p_activity_type text, p_activity_name text, p_product_or_service text, p_sector text, p_geography text, p_activity_status text, p_role_context text, p_description text, p_confidence numeric, p_source_url text, p_evidence_excerpt text', 'function', 'Upsert one source-backed commercial activity observation without deleting prior company identity data.', 'write', '042_cprofile_company_schema.sql'),
  ('tracker', 'record_cprofile_role_observation', 'p_company_id uuid, p_role_type text, p_scope_type text, p_scope_id uuid, p_role_status text, p_confidence numeric, p_source_url text, p_evidence_excerpt text, p_valid_from date, p_valid_to date', 'function', 'Upsert one scoped company role observation for buyer, seller, investor, or other commercial roles.', 'write', '042_cprofile_company_schema.sql'),
  ('tracker', 'record_cprofile_firecrawl_snapshot', 'p_company_id uuid, p_source_url text, p_canonical_url text, p_provider_run_id text, p_content_hash text, p_markdown text, p_retrieved_at timestamp with time zone, p_status_code integer, p_metadata jsonb', 'function', 'Persist an idempotent Firecrawl Markdown snapshot and conditionally refresh the latest company projection.', 'write', '042_cprofile_company_schema.sql'),
  ('tracker', 'link_cprofile_contact', 'p_company_id uuid, p_contact_id uuid, p_relationship_type text, p_source_url text, p_evidence_excerpt text', 'function', 'Link one canonical company to one existing public contact with source provenance.', 'write', '042_cprofile_company_schema.sql'),
  ('tracker_read', 'list_cprofiles', 'p_limit integer, p_offset integer, p_search text', 'function', 'Return a bounded, ordered company page from the read model.', 'read', '042_cprofile_company_schema.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind)
do update set purpose = excluded.purpose, data_operation = excluded.data_operation,
              source_migration = excluded.source_migration, updated_at = now();

commit;
