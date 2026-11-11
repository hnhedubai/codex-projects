begin;

create or replace function tracker_read.list_cprofiles(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null,
  p_sort_key text default null,
  p_sort_direction text default 'asc'
)
returns setof tracker_read.v_cprofiles
language sql
security invoker
set search_path = pg_catalog, tracker_read
as $$
  select company.*
  from tracker_read.v_cprofiles company
  where p_search is null
     or company.canonical_name ilike '%' || trim(p_search) || '%'
     or coalesce(company.primary_domain, '') ilike '%' || trim(p_search) || '%'
  order by
    case when lower(coalesce(p_sort_direction, 'asc')) = 'asc' then case p_sort_key
      when 'id' then company.id::text when 'canonicalName' then company.canonical_name
      when 'legalName' then company.legal_name when 'displayName' then company.display_name
      when 'companyStatus' then company.company_status when 'legalForm' then company.legal_form
      when 'countryOfRegistration' then company.country_of_registration::text when 'websiteUrl' then company.website_url
      when 'primaryDomain' then company.primary_domain when 'linkedinUrl' then company.linkedin_url
      when 'description' then company.description when 'companyType' then company.company_type
      when 'verificationStatus' then company.verification_status when 'identityConfidence' then company.identity_confidence::text when 'firecrawlMarkdown' then company.firecrawl_markdown
      when 'firecrawlMarkdownAt' then company.firecrawl_markdown_at::text when 'firecrawlMarkdownHash' then company.firecrawl_markdown_hash
      when 'firecrawlSourceUrl' then company.firecrawl_source_url when 'firstSeenAt' then company.first_seen_at::text
      when 'lastSeenAt' then company.last_seen_at::text when 'createdAt' then company.created_at::text
      when 'updatedAt' then company.updated_at::text end end asc nulls last,
    case when lower(coalesce(p_sort_direction, 'asc')) = 'desc' then case p_sort_key
      when 'id' then company.id::text when 'canonicalName' then company.canonical_name
      when 'legalName' then company.legal_name when 'displayName' then company.display_name
      when 'companyStatus' then company.company_status when 'legalForm' then company.legal_form
      when 'countryOfRegistration' then company.country_of_registration::text when 'websiteUrl' then company.website_url
      when 'primaryDomain' then company.primary_domain when 'linkedinUrl' then company.linkedin_url
      when 'description' then company.description when 'companyType' then company.company_type
      when 'verificationStatus' then company.verification_status when 'identityConfidence' then company.identity_confidence::text when 'firecrawlMarkdown' then company.firecrawl_markdown
      when 'firecrawlMarkdownAt' then company.firecrawl_markdown_at::text when 'firecrawlMarkdownHash' then company.firecrawl_markdown_hash
      when 'firecrawlSourceUrl' then company.firecrawl_source_url when 'firstSeenAt' then company.first_seen_at::text
      when 'lastSeenAt' then company.last_seen_at::text when 'createdAt' then company.created_at::text
      when 'updatedAt' then company.updated_at::text end end desc nulls last,
    company.updated_at desc, company.id
  limit least(greatest(coalesce(p_limit, 25), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

insert into tracker.routine_catalog (routine_schema, routine_name, identity_arguments, routine_kind, purpose, data_operation, source_migration)
values ('tracker_read', 'list_cprofiles', 'p_limit integer, p_offset integer, p_search text, p_sort_key text, p_sort_direction text', 'function', 'Return a bounded, searchable and sortable company page from the PCompany read model.', 'read', '055_account_read_sorting.sql')
on conflict (routine_schema, routine_name, identity_arguments, routine_kind) do update set purpose = excluded.purpose, source_migration = excluded.source_migration, updated_at = now();

commit;
